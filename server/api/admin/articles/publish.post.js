import { createError, readBody, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { publishArticleToMoltbook } from "~/server/utils/articleMoltbook";

const toTrimmedString = (value) => String(value || "").trim();
const toArray = (value) => (Array.isArray(value) ? value : []);

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleId = toTrimmedString(body.articleId);
    const title = body.title;
    const botLabel = toTrimmedString(body.botLabel) || "Topic Agent";
    const botAvatarUrl = toTrimmedString(body.botAvatarUrl) || null;
    const summary = toTrimmedString(body.summary);
    const points = toArray(body.points);
    const tags = toArray(body.tags);
    const rules = toArray(body.rules).length
      ? toArray(body.rules)
      : ["be respectful", "stay on topic"];
    const overrides =
      body.overrides && typeof body.overrides === "object" && !Array.isArray(body.overrides)
        ? body.overrides
        : {};

    if (!articleId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing articleId",
      });
    }

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const cfg = useRuntimeConfig(event);
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select("id, title, slug, image_path, tags, rewrite_meta, newsmesh_meta")
      .eq("id", articleId)
      .maybeSingle();

    if (articleError) throw articleError;
    if (!article) {
      throw createError({
        statusCode: 404,
        statusMessage: "Article not found",
      });
    }

    const canonicalUrl = article.slug
      ? `${cfg.public.SITE_URL}/articles/${article.slug}`
      : null;
    const resolvedTitle = toTrimmedString(title || article.title);
    const resolvedSummary =
      summary ||
      toTrimmedString(article?.rewrite_meta?.summary) ||
      toTrimmedString(article?.newsmesh_meta?.summary) ||
      toTrimmedString(article?.newsmesh_meta?.description);

    const threadInsert = {
      kind: "article",
      article_id: articleId,
      title: resolvedTitle,
      bot_label: botLabel,
      bot_avatar_url:
        botAvatarUrl ||
        (article.image_path
          ? `${cfg.public.SUPABASE_BUCKET}/articles/${article.image_path}`
          : null),
      bot_context: {
        summary: resolvedSummary,
        points,
        tags: tags.length ? tags : toArray(article.tags),
        canonical_url: canonicalUrl,
        rules,
      },
      agent_overrides: overrides,
      published: true,
    };

    const { data: thread, error: threadError } = await supabase
      .from("threads")
      .upsert(threadInsert, { onConflict: "article_id" })
      .select("id")
      .single();

    if (threadError) throw threadError;

    let moltbook = null;
    try {
      const moltbookResult = await publishArticleToMoltbook({
        event,
        supabase,
        article,
        title: resolvedTitle,
        summary,
        points,
      });
      moltbook = moltbookResult.moltbook;
    } catch (moltbookError) {
      console.error("[publish] Moltbook autopost failed:", moltbookError);
      moltbook = {
        attempted: true,
        posted: false,
        skipped: false,
        reason:
          moltbookError?.statusMessage || moltbookError?.message || "post_failed",
        postId: null,
      };
    }

    return { success: true, threadId: thread.id, moltbook };
  } catch (error) {
    console.error("[admin/articles][publish] post error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.statusMessage || error?.message || "Unable to publish article",
      ...(error?.data ? { details: error.data } : {}),
    };
  }
});
