import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const { messageId, value } = (await readBody(event)) || {};
  if (!messageId)
    throw createError({ statusCode: 400, statusMessage: "messageId required" });
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
    .from("votes_messages")
    .select("value")
    .eq("message_id", messageId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (selErr)
    throw createError({ statusCode: 500, statusMessage: selErr.message });

  let mutErr = null;
  if (existing?.value === value) {
    const { error } = await supa
      .from("votes_messages")
      .delete()
      .eq("message_id", messageId)
      .eq("user_id", user.id);
    mutErr = error;
  } else if (existing) {
    const { error } = await supa
      .from("votes_messages")
      .update({ value })
      .eq("message_id", messageId)
      .eq("user_id", user.id);
    mutErr = error;
  } else {
    const { error } = await supa
      .from("votes_messages")
      .insert([{ message_id: messageId, user_id: user.id, value }]);
    mutErr = error;
  }
  if (mutErr)
    throw createError({ statusCode: 500, statusMessage: mutErr.message });

  const [{ data: s1 }, { data: s2 }, { data: my }] = await Promise.all([
    supa
      .from("message_scores")
      .select("score,upvotes,downvotes")
      .eq("message_id", messageId)
      .maybeSingle(),
    supa
      .from("message_scores_today")
      .select("today")
      .eq("message_id", messageId)
      .maybeSingle(),
    supa
      .from("votes_messages")
      .select("value")
      .eq("message_id", messageId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    messageId,
    score: s1?.score ?? 0,
    upvotes: s1?.upvotes ?? 0,
    downvotes: s1?.downvotes ?? 0,
    today: s2?.today ?? 0,
    userVote: my?.value ?? 0,
  };
});
