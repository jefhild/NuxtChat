import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";
import { sendDigestEmail } from "@/server/utils/emailGateway";
import { t } from "@/server/utils/emailI18n";
import {
  renderWeeklyDigest,
  type WeeklyDigestData,
  type InteractionSummary,
} from "@/server/utils/emailTemplates/weeklyDigest";
import {
  buildWeeklyDigestRenderedBlock,
  fetchWeeklyDigestContent,
  normalizeWeeklyDigestLocale,
} from "@/server/utils/weeklyDigestContent";

interface InteractionRow {
  actor_id: string | null;
  interaction: "favorite" | "profile_upvote" | "message";
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event);

  // Admin auth check
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: me } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!me?.is_admin) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  const body = await readBody(event);
  const { userId, type = "weekly_digest", localeOverride } = body ?? {};

  if (!userId) {
    setResponseStatus(event, 400);
    return { error: "userId is required" };
  }

  if (type !== "weekly_digest") {
    setResponseStatus(event, 400);
    return { error: `Unknown email type: ${type}` };
  }

  // Fetch recipient profile
  const { data: profile, error: profileErr } = await supa
    .from("profiles")
    .select("user_id, displayname, slug, preferred_locale")
    .eq("user_id", userId)
    .single();

  if (profileErr || !profile) {
    setResponseStatus(event, 404);
    return { error: "Profile not found" };
  }

  // Fetch recipient's confirmed email from auth
  const { data: authUser, error: authErr } =
    await supa.auth.admin.getUserById(userId);

  if (authErr || !authUser?.user?.email) {
    setResponseStatus(event, 404);
    return { error: "No confirmed email found for this user" };
  }

  const email = authUser.user.email;
  const locale = normalizeWeeklyDigestLocale(
    localeOverride || profile.preferred_locale || "en"
  );

  // Fetch all pending (unsent) interactions — preview does NOT mark them sent
  const { data: rows } = await supa
    .from("notification_interaction_log")
    .select("actor_id, interaction")
    .eq("recipient_id", userId)
    .is("digest_sent_at", null);

  const interactionRows = (rows ?? []) as InteractionRow[];

  const actorIds = [
    ...new Set(
      interactionRows
        .map((r) => r.actor_id)
        .filter((id): id is string => id !== null)
    ),
  ];

  let actorProfiles: { user_id: string; displayname: string | null; slug: string | null }[] = [];
  if (actorIds.length > 0) {
    const { data: actors } = await supa
      .from("profiles")
      .select("user_id, displayname, slug")
      .in("user_id", actorIds);
    actorProfiles = actors ?? [];
  }

  const actorMap = new Map(actorProfiles.map((a) => [a.user_id, a]));

  function buildSummary(
    type: "favorite" | "profile_upvote" | "message"
  ): InteractionSummary {
    const typeRows = interactionRows.filter((r) => r.interaction === type);
    const seen = new Set<string>();
    const attributed = typeRows
      .filter((r) => r.actor_id && actorMap.has(r.actor_id))
      .map((r) => {
        const actor = actorMap.get(r.actor_id!)!;
        return { name: actor.displayname ?? "Unknown", slug: actor.slug ?? actor.user_id };
      })
      .filter((a) => {
        if (seen.has(a.slug)) return false;
        seen.add(a.slug);
        return true;
      });
    return { total: typeRows.length, attributed };
  }

  const siteUrl = cfg.public.SITE_URL || "https://imchatty.com";
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const localeTag =
    locale === "zh" ? "zh-CN" :
    locale === "ru" ? "ru-RU" :
    locale === "fr" ? "fr-FR" : "en-US";

  const digestData: WeeklyDigestData = {
    displayname: profile.displayname ?? email,
    email,
    slug: profile.slug ?? userId,
    periodStart: weekAgo.toLocaleDateString(localeTag, { month: "short", day: "numeric" }),
    periodEnd: now.toLocaleDateString(localeTag, { month: "short", day: "numeric" }),
    favorites: buildSummary("favorite"),
    upvotes: buildSummary("profile_upvote"),
    messages: buildSummary("message"),
    settingsUrl: `${siteUrl}/settings`,
    siteUrl,
  };

  const digestContent = await fetchWeeklyDigestContent(supa, locale);
  const html = renderWeeklyDigest(digestData, locale, {
    customBlock: buildWeeklyDigestRenderedBlock(digestContent.content),
  });

  await sendDigestEmail(
    {
      to: email,
      subject: `[TEST] ${t("emails.digest.subject", locale)}`,
      html,
      fromEmail: cfg.SENDGRID_FROM_EMAIL,
      fromName: cfg.SENDGRID_FROM_NAME,
      unsubscribeGroupId: cfg.SENDGRID_UNSUBSCRIBE_GROUP_ID
        ? Number(cfg.SENDGRID_UNSUBSCRIBE_GROUP_ID)
        : undefined,
    },
    cfg.SENDGRID_API_KEY
  );

  return { success: true, sentTo: email };
});
