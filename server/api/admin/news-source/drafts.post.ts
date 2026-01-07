import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import {
  AI_PERSONA_SELECT,
  getServiceRoleClient,
  slugify,
} from "~/server/utils/aiBots";

type RewriteReference = {
  label: string;
  url?: string | null;
};

type RewritePayload = {
  headline: string;
  summary: string;
  body: string;
  references: RewriteReference[];
  raw?: string;
};

const ARTICLE_SANITIZE_OPTIONS: Parameters<typeof DOMPurify.sanitize>[1] = {
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
  ALLOWED_ATTR: [
    "href",
    "rel",
    "target",
    "title",
    "class",
    "src",
    "alt",
    "data-persona-slug",
    "role",
    "tabindex",
    "aria-label",
  ],
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

const normalizeName = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const ensureUniqueSlug = async (
  client: any,
  preferredTitle: string | null,
  fallback: string
) => {
  const baseSlug =
    slugify(preferredTitle || fallback || "manual-source") ||
    "manual-source";
  let slug = baseSlug;
  let attempt = 1;

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

const buildArticleHtml = (
  sourceMeta: {
    url: string;
    title: string | null;
    summary: string | null;
    domain: string | null;
  },
  rewrite: RewritePayload,
  personaMeta: {
    name?: string | null;
    avatarUrl?: string | null;
    slug?: string | null;
  }
) => {
  const bodyHtml = marked.parse(rewrite.body || "");

  const summaryHtml =
    sourceMeta.summary || rewrite.summary
      ? `<p class="article-summary">${escapeHtml(
          sourceMeta.summary || rewrite.summary || ""
        )}</p>`
      : "";

  const sourceLabel = escapeHtml(
    sourceMeta.domain ||
      sourceMeta.title ||
      (sourceMeta.url ? new URL(sourceMeta.url).hostname : "Source unknown")
  );
  const link = toSafeUrl(sourceMeta.url);
  const personaLabel = personaMeta?.name
    ? escapeHtml(personaMeta.name)
    : null;
  const personaSlug = personaMeta?.slug
    ? escapeHtml(personaMeta.slug)
    : null;
  const personaAvatar = personaMeta?.avatarUrl
    ? escapeHtml(personaMeta.avatarUrl)
    : null;
  const personaLine = personaLabel
    ? `<div class="persona-line">
        ${
          personaAvatar
            ? `<img class="persona-avatar" src="${personaAvatar}" alt="${personaLabel} avatar" loading="lazy" />`
            : ""
        }
        <span class="persona-label">Perspective:</span>
        ${
          personaSlug
            ? `<span class="persona-link" role="button" tabindex="0" data-persona-slug="${personaSlug}" aria-label="Open ${personaLabel} profile">${personaLabel}</span>`
            : `<span class="persona-name">${personaLabel}</span>`
        }
      </div>`
    : "";

  const sourceBlock = link
    ? `<a href="${link}" target="_blank" rel="noopener noreferrer">${sourceLabel}</a>`
    : sourceLabel;

  const articleHtml = `<article class="manual-source-article">
  <header class="article-header">
    <p class="source-line">${sourceBlock}</p>
    <h1>${escapeHtml(sourceMeta.title || rewrite.headline)}</h1>
    ${personaLine}
    ${summaryHtml}
  </header>
  <section class="rewrite-body">
    ${bodyHtml}
  </section>
</article>`;

  return DOMPurify.sanitize(articleHtml, ARTICLE_SANITIZE_OPTIONS);
};

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const sourceUrl = toSafeUrl(body.sourceUrl);
    const personaKey = String(body.personaKey || "").trim();
    const rewrite = body.rewrite as RewritePayload | undefined;

    const sourceTitle = normalizeName(body.sourceTitle);
    const sourceSummary = normalizeName(body.sourceSummary);
    const sourceDomain = normalizeName(body.sourceDomain);

    if (!sourceUrl) {
      setResponseStatus(event, 400);
      return { success: false, error: "sourceUrl is required." };
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

    const personaMeta = {
      name: persona.profile?.displayname || persona.persona_key,
      avatarUrl: persona.profile?.avatar_url || null,
      slug: persona.profile?.slug || null,
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
      social: rewrite.social || null,
      raw: rewrite,
    };

    const sourceMeta = {
      url: sourceUrl,
      title: sourceTitle,
      summary: sourceSummary,
      domain: sourceDomain,
    };

    const content = buildArticleHtml(sourceMeta, rewrite, personaMeta);
    const slug = await ensureUniqueSlug(
      supabase,
      sourceTitle,
      rewrite.headline
    );

    const insertPayload = {
      title: sourceTitle || rewrite.headline,
      slug,
      content,
      type: "blog",
      is_published: false,
      category_id: null,
      image_path: null,
      photo_credits_url: sourceUrl,
      persona_key: personaKey,
      persona_id: persona.id,
      persona_display_name: personaMeta.name,
      persona_avatar_url: personaMeta.avatarUrl,
      newsmesh_id: null,
      newsmesh_meta: {
        source_url: sourceUrl,
        source_title: sourceTitle,
        source_summary: sourceSummary,
        source_domain: sourceDomain,
        source_type: "manual-url",
      },
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
    console.error("[admin/news-source] draft save error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage || err?.message || "Unable to save draft article.",
    };
  }
});
