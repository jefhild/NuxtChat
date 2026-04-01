import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const { profileUserId } = (await readBody(event)) || {};
  if (!profileUserId)
    throw createError({ statusCode: 400, statusMessage: "profileUserId required" });

  if (profileUserId === user.id)
    throw createError({ statusCode: 400, statusMessage: "Cannot upvote yourself" });

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(cfg.public.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY);

  const { data: profileRow, error: profileErr } = await supa
    .from("profiles")
    .select("id, upvotes_count")
    .eq("user_id", profileUserId)
    .maybeSingle();

  if (profileErr || !profileRow)
    throw createError({ statusCode: 404, statusMessage: "Profile not found" });

  const { data: existing } = await supa
    .from("votes")
    .select("id, vote_type")
    .eq("profile_id", profileRow.id)
    .eq("user_id", user.id)
    .maybeSingle();

  let newCount = profileRow.upvotes_count ?? 0;
  let hasVoted = false;

  if (existing?.vote_type === "upvote") {
    // Toggle off — remove the upvote
    const { error: delErr } = await supa.from("votes").delete().eq("id", existing.id);
    if (delErr) throw createError({ statusCode: 500, statusMessage: delErr.message });

    const decremented = Math.max(0, newCount - 1);
    await supa.from("profiles").update({ upvotes_count: decremented }).eq("id", profileRow.id);
    newCount = decremented;
    hasVoted = false;
  } else {
    // Add upvote via RPC (handles downvote conversion atomically)
    const { error: rpcErr } = await supa.rpc("upvote_profile", {
      target_user_id: profileUserId,
      voter_user_id: user.id,
    });
    if (rpcErr) throw createError({ statusCode: 500, statusMessage: rpcErr.message });

    const { data: updated } = await supa
      .from("profiles")
      .select("upvotes_count")
      .eq("id", profileRow.id)
      .maybeSingle();

    newCount = updated?.upvotes_count ?? newCount + 1;
    hasVoted = true;
  }

  return { upvotes: newCount, hasVoted };
});
