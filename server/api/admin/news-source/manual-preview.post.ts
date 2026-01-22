import { buildManualPrompt } from "~/server/utils/manualRewrite";

const normalizeText = (value?: string | null) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
};

const toSafeHttpUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    const url = new URL(String(value).trim());
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // ignore invalid URLs
  }
  return null;
};

const normalizeListInput = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry).trim())
      .filter((entry) => entry);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry);
  }
  return [];
};

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const title = normalizeText(body.title);
    const summary = normalizeText(body.summary);
    const link = toSafeHttpUrl(body.link);
    const source = normalizeText(body.source);
    const articleBody = normalizeText(body.body);
    const category = normalizeText(body.category);
    const topics = normalizeListInput(body.topics);
    const people = normalizeListInput(body.people);
    const publishedDate =
      normalizeText(body.publishedDate) || normalizeText(body.published_date);
    const extraInstructions = normalizeText(body.instructions);

    if (!title) {
      setResponseStatus(event, 400);
      return { success: false, error: "Title is required." };
    }

    if (!articleBody) {
      setResponseStatus(event, 400);
      return { success: false, error: "Body text is required." };
    }

    if (!link) {
      setResponseStatus(event, 400);
      return { success: false, error: "A valid source URL is required." };
    }

    const { prompt, sourceText } = buildManualPrompt({
      article: {
        title,
        summary,
        body: articleBody,
        link,
        source,
        category,
        topics,
        people,
        published_date: publishedDate,
      },
      extraInstructions: extraInstructions || undefined,
    });

    return {
      success: true,
      data: {
        prompt,
        sourceText,
        original: {
          title,
          description: summary,
          link,
          source,
          published_date: publishedDate,
        },
        meta: {
          category,
          topics,
          people,
        },
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/news-source] manual preview error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage ||
        err?.message ||
        "Unable to build prompt preview.",
    };
  }
});
