import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  AI_PERSONA_SELECT,
  getServiceRoleClient,
  slugify,
} from "~/server/utils/aiBots";
import type { RewritePayload, RewriteReference } from "./types";

const ARTICLE_SANITIZE_OPTIONS: Parameters<
  typeof DOMPurify.sanitize
>[1] = {
  ALLOWED_TAGS: [
    "article",
    "figure",
    "figcaption",
    "header",
    "section",
    "h1",
    "h2",
    "h3",
    "h4",
    "div",
    "span",
    "p",
    "ul",
    "ol",
    "li",
    "img",
    "em",
    "strong",
    "a",
    "blockquote",
    "hr",
  ],
  ALLOWED_ATTR: ["href", "rel", "target", "title", "class", "src", "alt"],
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const toSafeUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
};

const normalizeReferences = (value: unknown): RewriteReference[] => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") {
        return { label: entry };
      }
      if (typeof entry === "object") {
        const label =
          typeof (entry as any).label === "string"
            ? (entry as any).label
            : typeof (entry as any).title === "string"
            ? (entry as any).title
            : typeof (entry as any).source === "string"
            ? (entry as any).source
            : null;
        const url =
          typeof (entry as any).url === "string"
            ? (entry as any).url
            : typeof (entry as any).link === "string"
            ? (entry as any).link
            : undefined;
        if (!label && !url) return null;
        return {
          label: label || url || "Reference",
          url,
        };
      }
      return null;
    })
    .filter((entry): entry is RewriteReference => Boolean(entry));
};

const toList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) =>
        typeof entry === "string" ? entry : JSON.stringify(entry)
      )
      .filter(Boolean);
  }

  if (typeof value === "object") {
    return Object.values(value || {})
      .map((entry) =>
        typeof entry === "string" ? entry : JSON.stringify(entry)
      )
      .filter(Boolean);
  }

  if (typeof value === "string") return [value];
  return [];
};

const buildArticleHtml = (
  newsmesh: any,
  rewrite: RewritePayload,
  personaMeta: { name?: string; avatarUrl?: string }
) => {
  const bodyHtml = marked.parse(rewrite.body || "");

  const summaryHtml =
    newsmesh?.description || rewrite.summary
      ? `<p class="article-summary">${escapeHtml(
          newsmesh?.description || rewrite.summary || ""
        )}</p>`
      : "";

  const source = escapeHtml(newsmesh?.source || "Source unknown");
  const link = toSafeUrl(newsmesh?.link);
  const personaLabel = personaMeta?.name
    ? escapeHtml(personaMeta.name)
    : null;

  const sourceBlock = link
    ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${source}</a>`
    : source;

  const articleHtml = `<article class="newsmesh-article">
  <header class="article-header">
    <p class="source-line">${sourceBlock}</p>
    <h1>${escapeHtml(newsmesh?.title || rewrite.headline)}</h1>
    ${
      personaLabel
        ? `<p class="persona-line">Perspective: ${personaLabel}</p>`
        : ""
    }
    ${summaryHtml}
  </header>
  <section class="rewrite-body">
    ${bodyHtml}
  </section>
</article>`;

  return DOMPurify.sanitize(articleHtml, ARTICLE_SANITIZE_OPTIONS);
};

const ensureUniqueSlug = async (
  client: any,
  preferredTitle: string,
  fallback: string
) => {
  const baseSlug =
    slugify(preferredTitle || fallback || "newsmesh-draft") ||
    "newsmesh-draft";
  let slug = baseSlug;
  let attempt = 1;

  // Avoid tight loops by limiting attempts
  while (attempt <= 10) {
    const { data, error } = await client
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    if (!data) {
      return slug;
    }

    slug = `${baseSlug}-${attempt++}`;
  }

  return `${baseSlug}-${Date.now()}`;
};

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const personaKey = String(body.personaKey || "").trim();
    const rewrite = body.rewrite as RewritePayload | undefined;

    if (!articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "articleId is required." };
    }

    if (!personaKey) {
      setResponseStatus(event, 400);
      return { success: false, error: "personaKey is required." };
    }

    if (
      !rewrite ||
      typeof rewrite.headline !== "string" ||
      typeof rewrite.body !== "string"
    ) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "A rewrite with headline and body is required.",
      };
    }

    const supabase = await getServiceRoleClient(event);

    const { data: persona, error: personaError } = await supabase
      .from("ai_personas")
      .select(AI_PERSONA_SELECT)
      .eq("persona_key", personaKey)
      .eq("is_active", true)
      .maybeSingle();

    if (personaError) throw personaError;

    if (!persona) {
      setResponseStatus(event, 404);
      return { success: false, error: "Persona not found or inactive." };
    }

    const { data: article, error: articleError } = await supabase
      .from("newsmesh_union_view")
      .select(
        `
        id,
        stream,
        title,
        description,
        link,
        media_url,
        category,
        topics,
        people,
        published_date,
        last_seen_at,
        source
      `
      )
      .eq("id", articleId)
      .maybeSingle();

    if (articleError) throw articleError;

    if (!article) {
      setResponseStatus(event, 404);
      return { success: false, error: "Newsmesh article not found." };
    }

    const personaMeta = {
      name: persona.profile?.displayname || persona.persona_key,
      avatarUrl: persona.profile?.avatar_url || null,
    };

    const newsmeshMeta = {
      id: article.id,
      stream: article.stream,
      title: article.title,
      summary: article.description,
      description: article.description,
      link: article.link,
      source: article.source,
      category: article.category,
      topics: toList(article.topics),
      people: toList(article.people),
      published_date: article.published_date,
      last_seen_at: article.last_seen_at,
      media_url: article.media_url,
    };

    const rewriteMeta = {
      persona_key: personaKey,
      persona_id: persona.id,
      persona_display_name: personaMeta.name,
      persona_avatar_url: personaMeta.avatarUrl,
      headline: rewrite.headline,
      summary: rewrite.summary,
      body: rewrite.body,
      references: normalizeReferences(rewrite.references),
      raw: rewrite,
    };

    const content = buildArticleHtml(newsmeshMeta, rewrite, personaMeta);
    const slug = await ensureUniqueSlug(
      supabase,
      newsmeshMeta.title,
      rewrite.headline
    );

    const insertPayload = {
      title: newsmeshMeta.title || rewrite.headline,
      slug,
      content,
      type: "blog",
      is_published: false,
      category_id: null,
      image_path: null,
      photo_credits_url: article.link || null,
      persona_key: personaKey,
      persona_id: persona.id,
      persona_display_name: personaMeta.name,
      persona_avatar_url: personaMeta.avatarUrl,
      newsmesh_id: article.id,
      newsmesh_meta: newsmeshMeta,
      rewrite_meta: rewriteMeta,
    };

    const { data: draft, error: insertError } = await supabase
      .from("articles")
      .insert(insertPayload)
      .select("id, slug, title, is_published, persona_key, persona_id")
      .single();

    if (insertError) throw insertError;

    return { success: true, data: draft };
  } catch (error) {
    const err = error as any;
    console.error("[admin/newsmesh] draft save error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage || err?.message || "Unable to save draft article.",
    };
  }
});
