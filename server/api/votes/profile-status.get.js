import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) return { hasVoted: false };

  const { profileUserId } = getQuery(event);
  if (!profileUserId) return { hasVoted: false };

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(cfg.public.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profileRow } = await supa
    .from("profiles")
    .select("id")
    .eq("user_id", profileUserId)
    .maybeSingle();

  if (!profileRow) return { hasVoted: false, upvoteCount: 0 };

  const [{ data: existing }, { count }] = await Promise.all([
    supa
      .from("votes")
      .select("id")
      .eq("profile_id", profileRow.id)
      .eq("user_id", user.id)
      .eq("vote_type", "upvote")
      .maybeSingle(),
    supa
      .from("votes")
      .select("*", { count: "exact", head: true })
      .eq("profile_id", profileRow.id)
      .eq("vote_type", "upvote"),
  ]);

  return { hasVoted: !!existing, upvoteCount: count ?? 0 };
});
