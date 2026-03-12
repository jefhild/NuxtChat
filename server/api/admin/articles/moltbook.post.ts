import { createError, readBody, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { publishArticleToMoltbook } from "~/server/utils/articleMoltbook";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event)) || {}) as {
      articleId?: string;
      force?: boolean;
    };
    const articleId = String(body.articleId || "").trim();
    const force = Boolean(body.force);

    if (!articleId) {
      throw createError({
        statusCode: 400,
        statusMessage: "articleId is required",
      });
    }

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const { data: article, error } = await supabase
      .from("articles")
      .select("id, title, slug, rewrite_meta, newsmesh_meta")
      .eq("id", articleId)
      .maybeSingle();

    if (error) throw error;
    if (!article) {
      throw createError({
        statusCode: 404,
        statusMessage: "Article not found",
      });
    }

    const result = await publishArticleToMoltbook({
      event,
      supabase,
      article,
      force,
    });

    return {
      success: true,
      articleId,
      moltbook: result.moltbook,
      rewrite_meta: result.rewriteMeta || article.rewrite_meta || {},
    };
  } catch (error: any) {
    console.error("[admin/articles][moltbook] post error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error:
        error?.statusMessage || error?.message || "Unable to post article to Moltbook",
      ...(error?.data ? { details: error.data } : {}),
    };
  }
});
