import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const supabase = await getServiceRoleClient(event);
  const now = new Date();
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [{ data: profile }, { data: entry }, { data: skip }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "mood_feed_prompt_enabled, mood_feed_prompt_snooze_until, mood_feed_prompt_last_shown_at"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("mood_feed_entries")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("mood_feed_skips")
        .select("id, skipped_at")
        .eq("user_id", user.id)
        .order("skipped_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (profile?.mood_feed_prompt_enabled === false) {
    return { needsPrompt: false };
  }

  const snoozeUntil = profile?.mood_feed_prompt_snooze_until
    ? new Date(profile.mood_feed_prompt_snooze_until)
    : null;
  if (snoozeUntil && snoozeUntil > now) {
    return { needsPrompt: false };
  }

  const lastEntryAt = entry?.created_at ? new Date(entry.created_at) : null;
  const lastSkipAt = skip?.skipped_at ? new Date(skip.skipped_at) : null;

  const hasRecentEntry = lastEntryAt && lastEntryAt >= since;
  const hasRecentSkip = lastSkipAt && lastSkipAt >= since;
  if (hasRecentEntry || hasRecentSkip) {
    return { needsPrompt: false };
  }

  const lastShownAt = profile?.mood_feed_prompt_last_shown_at
    ? new Date(profile.mood_feed_prompt_last_shown_at)
    : null;
  if (lastShownAt) {
    const resolvedAt =
      lastEntryAt && lastSkipAt
        ? new Date(Math.max(lastEntryAt.getTime(), lastSkipAt.getTime()))
        : lastEntryAt || lastSkipAt || null;
    if (!resolvedAt || resolvedAt < lastShownAt) {
      return { needsPrompt: false };
    }
  }

  return { needsPrompt: true };
});
