// server/api/admin/articles/publish.post.js
import { publishArticleToMoltbook } from "~/server/utils/articleMoltbook";

export default defineEventHandler(async (event) => {
  try {
    // 1) Read body first
    const body = await readBody(event);
    const {
      articleId,
      title,
      botLabel,
      botAvatarUrl,
      summary = "",
      points = [],
      tags = [],
      rules = ["be respectful", "stay on topic"],
      overrides = {},
    } = body || {};

    if (!articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing articleId" };
    }

    // 2) Build Supabase server client lazily INSIDE the handler
    //    (avoid any top-level imports that might evaluate Nuxt composables)
    const { useDb } = await import("@/composables/useDB");
    const { getServerClientFrom } = useDb();

    // Read runtime config INSIDE the handler
    const cfg = useRuntimeConfig(event);
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: article, error: articleError } = await supa
      .from("articles")
      .select("id, title, slug, image_path, tags, rewrite_meta, newsmesh_meta")
      .eq("id", articleId)
      .single();

    if (articleError || !article) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: articleError?.message || "Article not found",
      };
    }

    const canonicalUrl = article.slug
      ? `${cfg.public.SITE_URL}/articles/${article.slug}`
      : null;
    const resolvedTitle = String(title || article.title || "").trim();
    const publishSummary = String(summary || "").trim();
    const resolvedSummary =
      publishSummary ||
      String(article?.rewrite_meta?.summary || "").trim() ||
      String(article?.newsmesh_meta?.summary || "").trim() ||
      String(article?.newsmesh_meta?.description || "").trim();

    // 3) Insert or upsert thread
    const bot_context = {
      summary: resolvedSummary,
      points,
      tags,
      canonical_url: canonicalUrl,
      rules,
    };

    const threadInsert = {
      kind: "article",
      article_id: articleId,
      title: resolvedTitle,
      bot_label: botLabel || "Topic Agent",
      bot_avatar_url: botAvatarUrl || null,
      bot_context,
      // you can add agent_preset_id/version if you use them
      agent_overrides: overrides,
    };

    const { data: thread, error: tErr } = await supa
      .from("threads")
      .upsert(threadInsert, { onConflict: "article_id" })
      .select("id")
      .single();

    if (tErr) {
      console.error("[publish] insert thread error:", tErr);
      setResponseStatus(event, 500);
      return { success: false, error: tErr.message };
    }

    let moltbook = null;
    try {
      const moltbookResult = await publishArticleToMoltbook({
        event,
        supabase: supa,
        article,
        title: resolvedTitle,
        summary: publishSummary,
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
  } catch (e) {
    // If anything throws, return 500 (so you see the error) instead of letting Nitro drop the route.
    console.error("[publish] handler error:", e);
    setResponseStatus(event, 500);
    return { success: false, error: String(e?.message || e) };
  }
});
