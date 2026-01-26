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

const normalizeName = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const prepareSlugEntries = (values: string[]) => {
  const deduped = new Map<string, string>();
  values.forEach((name) => {
    const normalized = normalizeName(name);
    if (!normalized) return;
    const slug = slugify(normalized);
    if (!slug) return;
    if (!deduped.has(slug)) {
      deduped.set(slug, normalized);
    }
  });
  return Array.from(deduped.entries()).map(([slug, name]) => ({
    slug,
    name,
  }));
};

const ensureCategoryRecord = async (
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  input?: string | null
) => {
  const name = normalizeName(input);
  if (!name) return null;
  const slug = slugify(name);
  if (!slug) return null;

  const { data: existing, error: existingError } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (existingError) throw existingError;
  if (existing) return existing.id;
  return null;
};

const ensureSlugRecords = async (
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  table: "tags" | "people",
  values: string[]
) => {
  const entries = prepareSlugEntries(values);
  if (!entries.length) return [];

  const { data: existing, error: fetchError } = await supabase
    .from(table)
    .select("id, slug")
    .in(
      "slug",
      entries.map((entry) => entry.slug)
    );
  if (fetchError) throw fetchError;

  const missing = entries.filter(
    (entry) => !existing?.some((record) => record.slug === entry.slug)
  );

  let inserted: { id: number; slug: string }[] = [];
  if (missing.length) {
    const { data, error } = await supabase
      .from(table)
      .insert(
        missing.map((entry) => ({
          name: entry.name,
          slug: entry.slug,
        }))
      )
      .select("id, slug");
    if (error) throw error;
    inserted = data || [];
  }

  const lookup = new Map<string, number>();
  [...(existing || []), ...inserted].forEach((record) => {
    lookup.set(record.slug, record.id);
  });

  return entries
    .map((entry) => lookup.get(entry.slug))
    .filter((id): id is number => typeof id === "number");
};

const linkArticleRecords = async (
  supabase: Awaited<ReturnType<typeof getServiceRoleClient>>,
  table: "article_tags" | "article_people",
  articleId: number,
  foreignKey: "tag_id" | "person_id",
  ids: number[]
) => {
  if (!ids.length) return;
  const { error } = await supabase.from(table).insert(
    ids.map((id) => ({
      article_id: articleId,
      [foreignKey]: id,
    }))
  );
  if (error) throw error;
};

const buildArticleHtml = (
  newsmesh: any,
  rewrite: RewritePayload,
  personaMeta: { name?: string; avatarUrl?: string; slug?: string | null }
) => {
  const cleanedBody = stripSocialCaptions(rewrite.body || "");
  const bodyHtml = marked.parse(cleanedBody);

  const summaryHtml =
    newsmesh?.description || rewrite.summary
      ? `<p class="article-summary">${escapeHtml(
          newsmesh?.description || rewrite.summary || ""
        )}</p>`
      : "";

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

  const articleHtml = `<article class="newsmesh-article">
  <header class="article-header">
    <h2>${escapeHtml(newsmesh?.title || rewrite.headline)}</h2>
    ${personaLine}
    ${summaryHtml}
  </header>
  <section class="rewrite-body">
    ${bodyHtml}
  </section>
</article>`;

  return DOMPurify.sanitize(articleHtml, ARTICLE_SANITIZE_OPTIONS);
};

function stripSocialCaptions(body = "") {
  if (!body) return "";
  const markers = [
    "social.facebook.caption",
    "social.instagram.caption",
    "social captions",
    "\"social\"",
    "\"facebook\"",
    "\"instagram\"",
  ];
  if (!markers.some((marker) => body.includes(marker))) {
    return body;
  }

  let next = body;
  next = next.replace(/```json[\s\S]*?```/gi, (match) =>
    markers.some((marker) => match.includes(marker)) ? "" : match
  );

  const lastOpen = next.lastIndexOf("{");
  const lastClose = next.lastIndexOf("}");
  if (lastOpen !== -1 && lastClose > lastOpen) {
    const candidate = next.slice(lastOpen, lastClose + 1);
    if (markers.some((marker) => candidate.includes(marker))) {
      next = `${next.slice(0, lastOpen)}${next.slice(lastClose + 1)}`;
    }
  }

  next = next
    .split(/\r?\n/)
    .filter((line) => !markers.some((marker) => line.includes(marker)))
    .join("\n")
    .trim();

  next = next
    .split(/\r?\n/)
    .filter((line) => !/social captions/i.test(line))
    .join("\n")
    .trim();

  return next;
}

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
    const originalLanguageCode = String(body.original_language_code || "")
      .trim()
      .replace(/\s+/g, "");

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
      slug: persona.profile?.slug || null,
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
      language_code: originalLanguageCode || null,
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

    const content = buildArticleHtml(newsmeshMeta, rewrite, personaMeta);
    const slug = await ensureUniqueSlug(
      supabase,
      newsmeshMeta.title,
      rewrite.headline
    );

    const [categoryId, tagIds, personIds] = await Promise.all([
      ensureCategoryRecord(supabase, newsmeshMeta.category),
      ensureSlugRecords(supabase, "tags", newsmeshMeta.topics),
      ensureSlugRecords(supabase, "people", newsmeshMeta.people),
    ]);

    const insertPayload = {
      title: newsmeshMeta.title || rewrite.headline,
      slug,
      content,
      type: "blog",
      is_published: false,
      category_id: categoryId,
      image_path: null,
      photo_credits_url: article.link || null,
      persona_key: personaKey,
      persona_id: persona.id,
      persona_display_name: personaMeta.name,
      persona_avatar_url: personaMeta.avatarUrl,
      newsmesh_id: article.id,
      newsmesh_meta: newsmeshMeta,
      rewrite_meta: rewriteMeta,
      original_language_code: originalLanguageCode || null,
    };

    const { data: draft, error: insertError } = await supabase
      .from("articles")
      .insert(insertPayload)
      .select("id, slug, title, is_published, persona_key, persona_id")
      .single();

    if (insertError) throw insertError;

    await Promise.all([
      linkArticleRecords(supabase, "article_tags", draft.id, "tag_id", tagIds),
      linkArticleRecords(
        supabase,
        "article_people",
        draft.id,
        "person_id",
        personIds
      ),
    ]);

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
