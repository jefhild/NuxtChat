import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import type { NewsmeshArticle } from "~/server/api/admin/newsmesh/types";

const MAX_SOURCE_CHARS = 6000;
const FETCH_TIMEOUT_MS = 12_000;

export const DEFAULT_USER_INSTRUCTIONS = `
You are assisting the Newsmesh editors. Take the supplied news record and rewrite it from your persona's perspective.
The rewrite must:
- Introduce a new angle or deeper context that was absent from the source summary.
- Cite at least two references, either the original source link or well-known, relevant background material.
- Highlight why this story matters for the audience represented by your persona.
- Produce a body made of 3-5 short paragraphs formatted in Markdown.
- Include a short summary (2 sentences) and a fresh headline.
- Provide social captions as JSON: social.facebook.caption (1-2 sentences + URL), social.instagram.caption (1-2 sentences, 3-6 hashtags, no link).
- Write the rewrite in the same language as the original record (title/summary). If the source is not English, keep that language for the headline, summary, body, and social captions.
- Ground the rewrite in concrete details from the Source Article Text if provided (names, numbers, dates, quotes).
Return strict JSON only (no surrounding text): {"headline": string, "summary": string, "body": string, "references": [{"label": string, "url": string}], "social": {"facebook": {"caption": string, "link": string}, "instagram": {"caption": string, "image_url": string}}}.
`;

const truncateText = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};

export const fetchArticleText = async (url: string | null) => {
  if (!url) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NewsmeshRewrite/1.0; +https://newsmesh.co)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (!html) return null;

    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();
    if (!article?.textContent) return null;

    const cleaned = article.textContent.replace(/\s+/g, " ").trim();
    return cleaned ? truncateText(cleaned, MAX_SOURCE_CHARS) : null;
  } catch (error) {
    console.warn("[admin/newsmesh] article fetch failed", url, error);
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export const buildArticleContext = (article: NewsmeshArticle) => {
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

  const topics = toList(article.topics);
  const people = toList(article.people);

  const parts = [
    `Stream: ${article.stream || "unknown"}`,
    `Source: ${article.source || "unknown"}`,
    article.published_date
      ? `Published: ${new Date(article.published_date).toISOString()}`
      : null,
    `Title: ${article.title || "Untitled"}`,
    article.description ? `Summary: ${article.description}` : null,
    article.category ? `Category: ${article.category}` : null,
    topics.length ? `Topics: ${topics.join(", ")}` : null,
    people.length ? `People: ${people.join(", ")}` : null,
    article.link ? `Canonical link: ${article.link}` : null,
  ];

  return parts.filter(Boolean).join("\n");
};

export const buildUserPrompt = async (input: {
  article: NewsmeshArticle;
  extraInstructions?: string;
}) => {
  const baseInstructions = [DEFAULT_USER_INSTRUCTIONS.trim()];
  if (input.extraInstructions) {
    baseInstructions.push(`Editor notes: ${input.extraInstructions}`);
  }

  const sourceText = await fetchArticleText(input.article.link || null);
  const sourceTextBlock = sourceText
    ? `\n\nSource Article Text (excerpt):\n${sourceText}`
    : "";

  const prompt = `${baseInstructions.join("\n\n")}\n\nOriginal Record:\n${buildArticleContext(
    input.article
  )}${sourceTextBlock}`;

  return { prompt, sourceText };
};
