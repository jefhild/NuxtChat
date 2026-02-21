import { randomBytes } from "node:crypto";
import { getRequestHeader } from "h3";

const ANON_DISPLAY_PREFIX = "Guest";

const slugBaseFromUserId = (userId) =>
  `guest-${String(userId || "").split("-")[0] || randomBytes(2).toString("hex")}`;

const displayNameFromUserId = (userId) =>
  `${ANON_DISPLAY_PREFIX} ${String(userId || "").split("-")[0] || "user"}`.trim();

const ensureUniqueSlug = async (supabase, base) => {
  let slug = base;
  for (let i = 0; i < 6; i += 1) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!data?.user_id) return slug;
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }
  return `${base}-${randomBytes(3).toString("hex")}`;
};

export const ensureMoodFeedAuthor = async (supabase, user) => {
  if (!user?.id) return;
  const { data: existing } = await supabase
    .from("mood_feed_authors")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing?.user_id) return;

  let displayname = null;
  let avatar_url = null;
  if (!user.is_anonymous) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("displayname, avatar_url")
      .eq("user_id", user.id)
      .maybeSingle();
    displayname = profile?.displayname || null;
    avatar_url = profile?.avatar_url || null;
  }

  if (!displayname) {
    displayname = displayNameFromUserId(user.id);
  }

  await supabase.from("mood_feed_authors").insert({
    user_id: user.id,
    displayname,
    avatar_url,
    is_anonymous: !!user.is_anonymous,
  });
};

export const enforceAnonLimit = async ({
  supabase,
  user,
  table,
  limit,
  limitType,
}) => {
  if (!user?.id || !user.is_anonymous) return;
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= limit) {
    throw createError({
      statusCode: 429,
      statusMessage: "anon_limit_reached",
      data: { limitType, limit, count: count ?? 0 },
    });
  }
};

export const ensureAnonCaptcha = async ({
  event,
  supabase,
  user,
  captchaToken,
}) => {
  if (!user?.id || !user.is_anonymous) return;

  const cfg = useRuntimeConfig(event);
  const captchaSecret = cfg.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET;
  const captchaRequired = !!captchaSecret;
  if (!captchaRequired) return;

  const { data: gate } = await supabase
    .from("mood_feed_anon_gate")
    .select("captcha_verified_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (gate?.captcha_verified_at) return;

  if (!captchaToken) {
    throw createError({
      statusCode: 403,
      statusMessage: "captcha_required",
    });
  }

  let ok = false;
  try {
    const body = new URLSearchParams({
      secret: captchaSecret,
      response: captchaToken,
    });
    const ip =
      getRequestHeader(event, "x-forwarded-for") ||
      getRequestHeader(event, "x-real-ip");
    if (ip) body.set("remoteip", ip.split(",")[0].trim());
    const res = await $fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    ok = !!res?.success;
  } catch {
    ok = false;
  }

  if (!ok) {
    throw createError({
      statusCode: 403,
      statusMessage: "captcha_failed",
    });
  }

  await supabase.from("mood_feed_anon_gate").upsert(
    {
      user_id: user.id,
      captcha_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
};

export const getMoodFeedPostCooldown = async ({
  supabase,
  userId,
  cooldownHours = 24,
  promptKey = null,
}) => {
  const hours = Number.isFinite(Number(cooldownHours))
    ? Math.max(1, Number(cooldownHours))
    : 24;
  if (!userId) {
    return {
      canPost: true,
      cooldownHours: hours,
      lastEntryAt: null,
      nextAllowedAt: null,
      remainingMs: 0,
    };
  }

  let query = supabase
    .from("mood_feed_entries")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const normalizedPromptKey = String(promptKey || "").trim();
  if (normalizedPromptKey) {
    query = query.eq("prompt_key", normalizedPromptKey);
  }

  const { data: lastEntry } = await query.maybeSingle();

  const lastEntryAt = lastEntry?.created_at
    ? new Date(lastEntry.created_at)
    : null;
  if (!lastEntryAt || Number.isNaN(lastEntryAt.getTime())) {
    return {
      canPost: true,
      cooldownHours: hours,
      lastEntryAt: null,
      nextAllowedAt: null,
      remainingMs: 0,
    };
  }

  const nextAllowedAtDate = new Date(lastEntryAt.getTime() + hours * 60 * 60 * 1000);
  const remainingMs = Math.max(0, nextAllowedAtDate.getTime() - Date.now());

  return {
    canPost: remainingMs <= 0,
    cooldownHours: hours,
    lastEntryAt: lastEntryAt.toISOString(),
    nextAllowedAt: nextAllowedAtDate.toISOString(),
    remainingMs,
  };
};

export const enforceMoodFeedPostCooldown = async ({
  supabase,
  userId,
  cooldownHours = 24,
  promptKey = null,
}) => {
  const status = await getMoodFeedPostCooldown({
    supabase,
    userId,
    cooldownHours,
    promptKey,
  });

  if (!status.canPost) {
    throw createError({
      statusCode: 429,
      statusMessage: "mood_feed_cooldown",
      data: {
        limitType: "cooldown",
        cooldownHours: status.cooldownHours,
        promptKey: String(promptKey || "").trim() || null,
        nextAllowedAt: status.nextAllowedAt,
        lastEntryAt: status.lastEntryAt,
        remainingMs: status.remainingMs,
      },
    });
  }

  return status;
};
