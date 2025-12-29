import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const { articleId } = getQuery(event);
  if (!articleId)
    throw createError({ statusCode: 400, statusMessage: "articleId required" });

  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch {}

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const [{ data: s1 }, { data: my }] = await Promise.all([
    supa
      .from("article_scores")
      .select("score,upvotes,downvotes")
      .eq("article_id", articleId)
      .maybeSingle(),
    user?.id
      ? supa
          .from("votes_unified")
          .select("value")
          .eq("target_type", "article")
          .eq("target_id", articleId)
          .eq("user_id", user.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    articleId,
    score: s1?.score ?? 0,
    upvotes: s1?.upvotes ?? 0,
    downvotes: s1?.downvotes ?? 0,
    userVote: my?.value ?? 0,
  };
});
