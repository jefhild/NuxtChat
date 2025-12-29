import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const { articleId, value } = (await readBody(event)) || {};
  if (!articleId)
    throw createError({ statusCode: 400, statusMessage: "articleId required" });
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
    .eq("target_type", "article")
    .eq("target_id", articleId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (selErr)
    throw createError({ statusCode: 500, statusMessage: selErr.message });

  let mutErr = null;
  if (existing?.value === value) {
    const { error } = await supa
      .from("votes_unified")
      .delete()
      .eq("target_type", "article")
      .eq("target_id", articleId)
      .eq("user_id", user.id);
    mutErr = error;
  } else if (existing) {
    const { error } = await supa
      .from("votes_unified")
      .update({ value })
      .eq("target_type", "article")
      .eq("target_id", articleId)
      .eq("user_id", user.id);
    mutErr = error;
  } else {
    const { error } = await supa
      .from("votes_unified")
      .insert([
        { target_type: "article", target_id: articleId, user_id: user.id, value },
      ]);
    mutErr = error;
  }
  if (mutErr)
    throw createError({ statusCode: 500, statusMessage: mutErr.message });

  const [{ data: s1 }, { data: my }] = await Promise.all([
    supa
      .from("article_scores")
      .select("score,upvotes,downvotes")
      .eq("article_id", articleId)
      .maybeSingle(),
    supa
      .from("votes_unified")
      .select("value")
      .eq("target_type", "article")
      .eq("target_id", articleId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  return {
    articleId,
    score: s1?.score ?? 0,
    upvotes: s1?.upvotes ?? 0,
    downvotes: s1?.downvotes ?? 0,
    userVote: my?.value ?? 0,
  };
});
