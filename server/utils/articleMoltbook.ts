import type { H3Event } from "h3";
import { createMoltbookPost } from "~/server/utils/moltbook";

const asObject = (value: unknown): Record<string, any> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};

const trimText = (value: unknown, max = 500) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

const buildMoltbookArticleContent = ({
  summary,
  points = [],
  url,
}: {
  summary?: unknown;
  points?: unknown[];
  url: string | null;
}) => {
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
  if (url) {
    lines.push("");
    lines.push(`Read more: ${url}`);
  }
  lines.push("What do you think?");
  return lines.join("\n").trim().slice(0, 40000);
};

export const publishArticleToMoltbook = async ({
  event,
  supabase,
  article,
  title,
  summary = "",
  points = [],
  force = false,
}: {
  event: H3Event;
  supabase: any;
  article: Record<string, any>;
  title?: unknown;
  summary?: unknown;
  points?: unknown[];
  force?: boolean;
}) => {
  const cfg = useRuntimeConfig(event);
  const rewriteMeta = asObject(article?.rewrite_meta);
  const existingMoltbook = asObject(rewriteMeta.moltbook);
  const canonicalUrl = article?.slug
    ? `${cfg.public.SITE_URL}/articles/${article.slug}`
    : null;
  const resolvedTitle = String(title || article?.title || "").trim();
  const resolvedSummary =
    trimText(summary, 500) ||
    trimText(rewriteMeta.summary, 500) ||
    trimText(article?.newsmesh_meta?.summary, 500) ||
    trimText(article?.newsmesh_meta?.description, 500);

  const moltbook = {
    attempted: false,
    posted: false,
    skipped: false,
    reason: null as string | null,
    postId: existingMoltbook.post_id || null,
    forced: Boolean(force),
  };

  const shouldAutopost =
    String(cfg.MOLTBOOK_ARTICLE_AUTOPUBLISH || "").toLowerCase() === "true";

  if (!shouldAutopost && !force) {
    moltbook.skipped = true;
    moltbook.reason = "disabled";
    return { moltbook, canonicalUrl, resolvedTitle, resolvedSummary };
  }

  if (!canonicalUrl) {
    moltbook.skipped = true;
    moltbook.reason = "missing_slug";
    return { moltbook, canonicalUrl, resolvedTitle, resolvedSummary };
  }

  if (existingMoltbook.post_id && !force) {
    moltbook.skipped = true;
    moltbook.reason = "already_posted";
    return { moltbook, canonicalUrl, resolvedTitle, resolvedSummary };
  }

  moltbook.attempted = true;

  const agentName = String(cfg.MOLTBOOK_ARTICLE_AGENT_NAME || "imchatty").trim();
  const submoltName = String(cfg.MOLTBOOK_ARTICLE_SUBMOLT || "general").trim();

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
      ...existingMoltbook,
      ...(force && existingMoltbook.post_id
        ? { previous_post_id: existingMoltbook.post_id }
        : {}),
      post_id: postId,
      posted_at: new Date().toISOString(),
      submolt_name: submoltName,
      url: canonicalUrl,
      title: resolvedTitle,
      agent_name: agentName,
    },
  };

  const { error: articleUpdateError } = await supabase
    .from("articles")
    .update({ rewrite_meta: nextRewriteMeta })
    .eq("id", article.id);

  if (articleUpdateError) {
    throw articleUpdateError;
  }

  moltbook.posted = true;
  moltbook.postId = postId;

  return {
    moltbook,
    canonicalUrl,
    resolvedTitle,
    resolvedSummary,
    rewriteMeta: nextRewriteMeta,
  };
};
