import { DEFAULT_USER_INSTRUCTIONS } from "~/server/utils/newsmeshRewrite";

const MAX_SOURCE_CHARS = 6000;

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
  const baseInstructions = [DEFAULT_USER_INSTRUCTIONS.trim()];
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
