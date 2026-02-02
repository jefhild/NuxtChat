import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const { entryId, value } = (await readBody(event)) || {};
  if (!entryId)
    throw createError({ statusCode: 400, statusMessage: "entryId required" });
  if (value !== 1 && value !== -1)
    throw createError({
      statusCode: 400,
      statusMessage: "value must be 1 or -1",
    });

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: existing, error: selErr } = await supa
    .from("votes_unified")
    .select("value")
    .eq("target_type", "mood_feed_entry")
    .eq("target_id", entryId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (selErr)
    throw createError({ statusCode: 500, statusMessage: selErr.message });

  let mutErr = null;
  if (existing?.value === value) {
    const { error } = await supa
      .from("votes_unified")
      .delete()
      .eq("target_type", "mood_feed_entry")
      .eq("target_id", entryId)
      .eq("user_id", user.id);
    mutErr = error;
  } else if (existing) {
    const { error } = await supa
      .from("votes_unified")
      .update({ value })
      .eq("target_type", "mood_feed_entry")
      .eq("target_id", entryId)
      .eq("user_id", user.id);
    mutErr = error;
  } else {
    const { error } = await supa.from("votes_unified").insert([
      {
        target_type: "mood_feed_entry",
        target_id: entryId,
        user_id: user.id,
        value,
      },
    ]);
    mutErr = error;
  }
  if (mutErr)
    throw createError({ statusCode: 500, statusMessage: mutErr.message });

  const [{ data: scoreRow }, { data: my }] = await Promise.all([
    supa
      .from("mood_feed_entry_scores")
      .select("score, upvotes, downvotes")
      .eq("entry_id", entryId)
      .maybeSingle(),
    supa
      .from("votes_unified")
      .select("value")
      .eq("target_type", "mood_feed_entry")
      .eq("target_id", entryId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    entryId,
    score: scoreRow?.score ?? 0,
    upvotes: scoreRow?.upvotes ?? 0,
    downvotes: scoreRow?.downvotes ?? 0,
    userVote: my?.value ?? 0,
  };
});
