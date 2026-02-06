const MAX_SOURCE_CHARS = 6000;
const DEFAULT_USER_INSTRUCTIONS = `
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
const HUMAN_TONE_INSTRUCTIONS = `
Write like a human editor, not a model:
- Vary sentence length and structure; avoid formulaic openers and closers.
- Prefer concrete, specific language over generic commentary.
- Avoid meta phrasing like "this article," "the piece," or "in conclusion."
- Do not overuse hedging ("may", "might", "could") unless the source warrants it.
- Keep the persona voice natural and distinct; no buzzwordy or overly polished phrasing.
`.trim();

export type ManualRewriteInput = {
  title: string;
  summary?: string | null;
  body: string;
  link?: string | null;
  source?: string | null;
  category?: string | null;
  topics?: string[];
  people?: string[];
  published_date?: string | null;
};

const normalizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const normalizeList = (value?: string[] | null) => {
  if (!value) return [];
  return value
    .map((entry) => String(entry).trim())
    .filter((entry) => entry);
};

const truncateText = (value: string, maxChars: number) => {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`;
};

const buildManualContext = (input: ManualRewriteInput) => {
  const topics = normalizeList(input.topics);
  const people = normalizeList(input.people);
  const parts = [
    `Stream: manual`,
    `Source: ${normalizeText(input.source) || "manual entry"}`,
    input.published_date ? `Published: ${input.published_date}` : null,
    `Title: ${input.title}`,
    input.summary ? `Summary: ${input.summary}` : null,
    input.category ? `Category: ${input.category}` : null,
    topics.length ? `Topics: ${topics.join(", ")}` : null,
    people.length ? `People: ${people.join(", ")}` : null,
    input.link ? `Canonical link: ${input.link}` : null,
  ];

  return parts.filter(Boolean).join("\n");
};

export const buildManualPrompt = (input: {
  article: ManualRewriteInput;
  extraInstructions?: string;
}) => {
  const baseInstructions = [
    DEFAULT_USER_INSTRUCTIONS.trim(),
    HUMAN_TONE_INSTRUCTIONS,
  ];
  if (input.extraInstructions) {
    baseInstructions.push(`Editor notes: ${input.extraInstructions}`);
  }

  const cleanedBody = String(input.article.body || "")
    .replace(/\s+/g, " ")
    .trim();
  const sourceText = cleanedBody
    ? truncateText(cleanedBody, MAX_SOURCE_CHARS)
    : "";

  const sourceTextBlock = sourceText
    ? `\n\nSource Article Text (provided):\n${sourceText}`
    : "";

  const prompt = `${baseInstructions.join("\n\n")}\n\nOriginal Record:\n${buildManualContext(
    input.article
  )}${sourceTextBlock}`;

  return { prompt, sourceText: sourceText || null };
};
