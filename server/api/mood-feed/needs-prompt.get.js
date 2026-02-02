import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const supabase = await getServiceRoleClient(event);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: entry }, { data: skip }] = await Promise.all([
    supabase
      .from("mood_feed_entries")
      .select("id, created_at")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mood_feed_skips")
      .select("id, skipped_at")
      .eq("user_id", user.id)
      .gte("skipped_at", since)
      .order("skipped_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const needsPrompt = !entry && !skip;
  return { needsPrompt };
});
