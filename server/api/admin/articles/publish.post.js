// server/api/admin/articles/publish.post.js
import { createMoltbookPost } from "~/server/utils/moltbook";

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const trimText = (value, max = 500) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const buildMoltbookArticleContent = ({ summary, points = [], url }) => {
  const cleanSummary = trimText(summary, 500);
  const cleanPoints = Array.isArray(points)
    ? points
        .map((point) => trimText(point, 140))
        .filter(Boolean)
        .slice(0, 3)
    : [];

  const lines = [];
  if (cleanSummary) lines.push(cleanSummary);
  if (cleanPoints.length) {
    lines.push("");
    cleanPoints.forEach((point) => lines.push(`- ${point}`));
  }
  lines.push("");
  lines.push(`Read more: ${url}`);
  lines.push("What do you think?");
  return lines.join("\n").trim().slice(0, 40000);
};

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

    const rewriteMeta = asObject(article.rewrite_meta);
    const existingMoltbook = asObject(rewriteMeta.moltbook);
    const canonicalUrl = article.slug
      ? `${cfg.public.SITE_URL}/articles/${article.slug}`
      : null;
    const resolvedTitle = String(title || article.title || "").trim();
    const resolvedSummary =
      trimText(summary, 500) ||
      trimText(rewriteMeta.summary, 500) ||
      trimText(article.newsmesh_meta?.summary, 500) ||
      trimText(article.newsmesh_meta?.description, 500);

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

    const moltbook = {
      attempted: false,
      posted: false,
      skipped: false,
      reason: null,
      postId: existingMoltbook.post_id || null,
    };

    const shouldAutopost =
      String(cfg.MOLTBOOK_ARTICLE_AUTOPUBLISH || "").toLowerCase() === "true";

    if (!shouldAutopost) {
      moltbook.skipped = true;
      moltbook.reason = "disabled";
    } else if (!canonicalUrl) {
      moltbook.skipped = true;
      moltbook.reason = "missing_slug";
    } else if (existingMoltbook.post_id) {
      moltbook.skipped = true;
      moltbook.reason = "already_posted";
    } else {
      moltbook.attempted = true;
      try {
        const agentName = String(
          cfg.MOLTBOOK_ARTICLE_AGENT_NAME || "imchatty"
        ).trim();
        const submoltName = String(
          cfg.MOLTBOOK_ARTICLE_SUBMOLT || "general"
        ).trim();

        const postResponse = await createMoltbookPost({
          event,
          personaKey: agentName,
          agentName,
          payload: {
            submolt_name: submoltName,
            title: resolvedTitle,
            url: canonicalUrl,
            type: "link",
            content: buildMoltbookArticleContent({
              summary: resolvedSummary,
              points,
              url: canonicalUrl,
            }),
          },
        });

        const postId =
          postResponse?.post?.id ||
          postResponse?.data?.id ||
          postResponse?.data?.post_id ||
          null;

        const nextRewriteMeta = {
          ...rewriteMeta,
          moltbook: {
            post_id: postId,
            posted_at: new Date().toISOString(),
            submolt_name: submoltName,
            url: canonicalUrl,
            title: resolvedTitle,
            agent_name: agentName,
          },
        };

        const { error: articleUpdateError } = await supa
          .from("articles")
          .update({ rewrite_meta: nextRewriteMeta })
          .eq("id", article.id);

        if (articleUpdateError) {
          console.error(
            "[publish] article rewrite_meta Moltbook update error:",
            articleUpdateError
          );
        }

        moltbook.posted = true;
        moltbook.postId = postId;
      } catch (moltbookError) {
        console.error("[publish] Moltbook autopost failed:", moltbookError);
        moltbook.reason =
          moltbookError?.statusMessage || moltbookError?.message || "post_failed";
      }
    }

    return { success: true, threadId: thread.id, moltbook };
  } catch (e) {
    // If anything throws, return 500 (so you see the error) instead of letting Nitro drop the route.
    console.error("[publish] handler error:", e);
    setResponseStatus(event, 500);
    return { success: false, error: String(e?.message || e) };
  }
});
