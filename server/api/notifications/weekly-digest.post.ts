import { useDb } from "@/composables/useDB";
import { sendDigestEmail } from "@/server/utils/emailGateway";
import { t } from "@/server/utils/emailI18n";
import {
  renderWeeklyDigest,
  type WeeklyDigestData,
  type InteractionSummary,
} from "@/server/utils/emailTemplates/weeklyDigest";

interface InteractionRow {
  actor_id: string | null;
  interaction: "favorite" | "profile_upvote" | "message";
}

interface ProfileRow {
  user_id: string;
  displayname: string | null;
  slug: string | null;
  preferred_locale: string | null;
  email_digest_enabled: boolean;
}

interface ActorProfile {
  user_id: string;
  displayname: string | null;
  slug: string | null;
}

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event);

  // Authenticate cron caller
  const cronSecret = getRequestHeader(event, "x-cron-secret");
  if (!cronSecret || cronSecret !== cfg.CRON_SECRET) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  // Fetch all eligible recipients (registered, digest enabled)
  const { data: recipients, error: recipientsErr } = await supa
    .from("profiles")
    .select("user_id, displayname, slug, preferred_locale, email_digest_enabled")
    .eq("email_digest_enabled", true)
    .not("user_id", "is", null);

  if (recipientsErr) {
    console.error("[weekly-digest] fetch recipients error:", recipientsErr);
    setResponseStatus(event, 500);
    return { error: recipientsErr.message };
  }

  // Build confirmed-email map by paginating auth.admin.listUsers
  const confirmedMap = new Map<string, string>();
  const perPage = 1000;
  for (let page = 1; page <= 100; page++) {
    const { data: listData, error: listErr } = await supa.auth.admin.listUsers({
      page,
      perPage,
    });
    if (listErr) {
      console.error("[weekly-digest] listUsers error:", listErr);
      setResponseStatus(event, 500);
      return { error: listErr.message };
    }
    const users = listData?.users ?? [];
    for (const u of users) {
      if (u.email_confirmed_at && u.email) {
        confirmedMap.set(u.id, u.email);
      }
    }
    if (users.length < perPage) break;
  }

  const eligibleRecipients = (recipients as ProfileRow[]).filter(
    (p) => p.user_id && confirmedMap.has(p.user_id)
  );

  const siteUrl = cfg.public.SITE_URL || "https://imchatty.com";
  const results = { sent: 0, skipped: 0, errors: [] as string[] };

  for (const recipient of eligibleRecipients) {
    try {
      const email = confirmedMap.get(recipient.user_id)!;
      const locale = recipient.preferred_locale ?? "en";

      // Fetch pending interactions for this recipient
      const { data: rows, error: rowsErr } = await supa
        .from("notification_interaction_log")
        .select("actor_id, interaction")
        .eq("recipient_id", recipient.user_id)
        .is("digest_sent_at", null);

      if (rowsErr) {
        console.error(
          `[weekly-digest] fetch interactions error for ${recipient.user_id}:`,
          rowsErr
        );
        results.errors.push(recipient.user_id);
        continue;
      }

      const interactionRows = (rows ?? []) as InteractionRow[];

      // Collect unique registered actor IDs for attribution
      const actorIds = [
        ...new Set(
          interactionRows
            .map((r) => r.actor_id)
            .filter((id): id is string => id !== null)
        ),
      ];

      let actorProfiles: ActorProfile[] = [];
      if (actorIds.length > 0) {
        const { data: actors } = await supa
          .from("profiles")
          .select("user_id, displayname, slug")
          .in("user_id", actorIds);
        actorProfiles = (actors ?? []) as ActorProfile[];
      }

      const actorMap = new Map(actorProfiles.map((a) => [a.user_id, a]));

      function buildSummary(
        type: "favorite" | "profile_upvote" | "message"
      ): InteractionSummary {
        const typeRows = interactionRows.filter((r) => r.interaction === type);
        const attributed = typeRows
          .filter((r) => r.actor_id && actorMap.has(r.actor_id))
          .map((r) => {
            const actor = actorMap.get(r.actor_id!)!;
            return {
              name: actor.displayname ?? "Unknown",
              slug: actor.slug ?? actor.user_id,
            };
          });

        // Deduplicate attributed users
        const seen = new Set<string>();
        const deduped = attributed.filter((a) => {
          if (seen.has(a.slug)) return false;
          seen.add(a.slug);
          return true;
        });

        return { total: typeRows.length, attributed: deduped };
      }

      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const digestData: WeeklyDigestData = {
        displayname: recipient.displayname ?? email,
        email,
        slug: recipient.slug ?? recipient.user_id,
        periodStart: weekAgo.toLocaleDateString(
          locale === "zh"
            ? "zh-CN"
            : locale === "ru"
              ? "ru-RU"
              : locale === "fr"
                ? "fr-FR"
                : "en-US",
          { month: "short", day: "numeric" }
        ),
        periodEnd: now.toLocaleDateString(
          locale === "zh"
            ? "zh-CN"
            : locale === "ru"
              ? "ru-RU"
              : locale === "fr"
                ? "fr-FR"
                : "en-US",
          { month: "short", day: "numeric" }
        ),
        favorites: buildSummary("favorite"),
        upvotes: buildSummary("profile_upvote"),
        messages: buildSummary("message"),
        settingsUrl: `${siteUrl}/settings`,
        siteUrl,
      };

      const html = renderWeeklyDigest(digestData, locale);

      await sendDigestEmail(
        {
          to: email,
          subject: t("emails.digest.subject", locale),
          html,
          fromEmail: cfg.SENDGRID_FROM_EMAIL,
          fromName: cfg.SENDGRID_FROM_NAME,
          unsubscribeGroupId: cfg.SENDGRID_UNSUBSCRIBE_GROUP_ID
            ? Number(cfg.SENDGRID_UNSUBSCRIBE_GROUP_ID)
            : undefined,
        },
        cfg.SENDGRID_API_KEY
      );

      // Mark all pending rows as sent
      await supa
        .from("notification_interaction_log")
        .update({ digest_sent_at: new Date().toISOString() })
        .eq("recipient_id", recipient.user_id)
        .is("digest_sent_at", null);

      results.sent++;
    } catch (err) {
      console.error(
        `[weekly-digest] error for recipient ${recipient.user_id}:`,
        err
      );
      results.errors.push(recipient.user_id);
    }
  }

  return results;
});
