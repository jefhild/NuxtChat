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
    "header",
    "section",
    "h1",
    "h2",
    "h3",
    "h4",
    "p",
    "ul",
    "ol",
    "li",
    "em",
    "strong",
    "a",
    "blockquote",
    "hr",
  ],
  ALLOWED_ATTR: ["href", "rel", "target", "title", "class"],
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

const buildArticleHtml = (rewrite: RewritePayload) => {
  const bodyHtml = marked.parse(rewrite.body || "");

  const summaryHtml = rewrite.summary
    ? `<p class="article-summary">${escapeHtml(rewrite.summary)}</p>`
    : "";

  const references = normalizeReferences(rewrite.references);
  const referencesHtml = references.length
    ? `<section class="article-references">
  <h4>References</h4>
  <ul>
    ${references
      .map((ref) => {
        const safeUrl = toSafeUrl(ref.url || undefined);
        const label = escapeHtml(ref.label || safeUrl || "Reference");
        if (safeUrl) {
          return `<li><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a></li>`;
        }
        return `<li>${label}</li>`;
      })
      .join("\n    ")}
  </ul>
</section>`
    : "";

  const articleHtml = `<article>
  <header>
    <h1>${escapeHtml(rewrite.headline)}</h1>
    ${summaryHtml}
  </header>
  ${bodyHtml}
  ${referencesHtml}
</article>`;

  return DOMPurify.sanitize(articleHtml, ARTICLE_SANITIZE_OPTIONS);
};

const ensureUniqueSlug = async (client: any, headline: string) => {
  const baseSlug = slugify(headline || "newsmesh-draft") || "newsmesh-draft";
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
        title,
        description,
        link,
        media_url,
        category
      `
      )
      .eq("id", articleId)
      .maybeSingle();

    if (articleError) throw articleError;

    if (!article) {
      setResponseStatus(event, 404);
      return { success: false, error: "Newsmesh article not found." };
    }

    const content = buildArticleHtml(rewrite);
    const slug = await ensureUniqueSlug(supabase, rewrite.headline);

    const insertPayload = {
      title: rewrite.headline,
      slug,
      content,
      type: "blog",
      is_published: false,
      category_id: null,
      image_path: null,
      photo_credits_url: article.link || null,
      persona_key: personaKey,
      persona_id: persona.id,
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
