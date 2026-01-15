import OpenAI from "openai";
import mustache from "mustache";
import {
  AI_PERSONA_SELECT,
  getServiceRoleClient,
} from "~/server/utils/aiBots";
import type {
  NewsmeshArticle,
  RewritePayload,
  RewriteReference,
} from "./types";

const MAX_BATCH = 5;

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

const sanitizeJsonResponse = (input = "") => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const buildFallbackSocial = (input: {
  headline: string;
  summary: string;
  url: string | null;
  imageUrl: string | null;
}): NonNullable<RewritePayload["social"]> => {
  const cleanHeadline = input.headline?.trim() || "New article";
  const cleanSummary = input.summary?.trim();
  const baseSummary = cleanSummary ? ` ${cleanSummary}` : "";
  const linkText = input.url ? `\n\n${input.url}` : "";
  const fbCaption = `${cleanHeadline}.${baseSummary}${linkText}`.trim();
  const igCaption = `${cleanHeadline}.${baseSummary}\n\n#news #update #story`;
  return {
    facebook: { caption: fbCaption, link: input.url },
    instagram: { caption: igCaption, image_url: input.imageUrl || null },
  };
};

const normalizeSocial = (
  value: any,
  fallback: NonNullable<RewritePayload["social"]>
): NonNullable<RewritePayload["social"]> => {
  const fbCaption =
    typeof value?.facebook?.caption === "string"
      ? value.facebook.caption.trim()
      : fallback.facebook.caption;
  const fbLink =
    typeof value?.facebook?.link === "string"
      ? value.facebook.link
      : fallback.facebook.link;
  const igCaption =
    typeof value?.instagram?.caption === "string"
      ? value.instagram.caption.trim()
      : fallback.instagram.caption;
  const igImageUrl =
    typeof value?.instagram?.image_url === "string"
      ? value.instagram.image_url
      : fallback.instagram.image_url;

  return {
    facebook: { caption: fbCaption, link: fbLink },
    instagram: { caption: igCaption, image_url: igImageUrl },
  };
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

const buildArticleContext = (article: NewsmeshArticle) => {
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
`;

const buildSystemPrompt = (persona: any) => {
  const rendered = mustache.render(persona?.system_prompt_template || "", {
    userName: "Newsmesh Editor",
    userGender: "",
    userAge: "",
  });

  return `${rendered}

You are now contributing rewritten news briefs for the Newsmesh editorial workflow. Emphasize your unique perspective while remaining factual. Reference credible context when making claims.`;
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (!config.OPENAI_API_KEY) {
    setResponseStatus(event, 500);
    return { success: false, error: "OPENAI_API_KEY is not configured" };
  }

  try {
    const body = (await readBody(event)) || {};
    const articleIds = Array.isArray(body.articleIds)
      ? body.articleIds.filter((id: unknown) => typeof id === "string")
      : [];
    const personaKey = String(body.personaKey || "").trim();
    const extraInstructions = String(body.instructions || "").trim();

    if (!articleIds.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Select at least one article." };
    }

    if (articleIds.length > MAX_BATCH) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: `You can rewrite up to ${MAX_BATCH} articles at a time.`,
      };
    }

    if (!personaKey) {
      setResponseStatus(event, 400);
      return { success: false, error: "personaKey is required." };
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

    const { data: articles, error: articlesError } = await supabase
      .from("newsmesh_union_view")
      .select(
        `
        stream,
        id,
        article_id,
        title,
        description,
        link,
        link_hash,
        media_url,
        published_date,
        source,
        category,
        topics,
        people,
        first_seen_at,
        last_seen_at,
        seen_count,
        status
      `
      )
      .in("id", articleIds);

    if (articlesError) throw articlesError;

    if (!articles?.length) {
      setResponseStatus(event, 404);
      return { success: false, error: "No articles found for selection." };
    }

    const articleMap = new Map(
      articles.map((article) => [article.id, article] as const)
    );

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const systemPrompt = buildSystemPrompt(persona);

    const results: Array<{
      articleId: string;
      stream: string;
      personaKey: string;
      original: {
        title: string | null;
        description: string | null;
        link: string | null;
        source: string | null;
      };
      rewrite: RewritePayload;
    }> = [];

    for (const articleId of articleIds) {
      const article = articleMap.get(articleId);
      if (!article) continue;

      const baseInstructions = [DEFAULT_USER_INSTRUCTIONS.trim()];
      if (extraInstructions) {
        baseInstructions.push(`Editor notes: ${extraInstructions}`);
      }

      const userPrompt = `${baseInstructions.join(
        "\n\n"
      )}\n\nOriginal Record:\n${buildArticleContext(article)}`;

      const response = await openai.chat.completions.create({
        model: persona.model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: persona.temperature ?? 0.7,
        top_p: persona.top_p ?? 1,
        presence_penalty: persona.presence_penalty ?? 0,
        frequency_penalty: persona.frequency_penalty ?? 0,
        max_tokens: persona.max_response_tokens ?? 800,
      });

      const raw = response?.choices?.[0]?.message?.content ?? "";
      const parsed = sanitizeJsonResponse(raw);

      const fallbackSocial = buildFallbackSocial({
        headline:
          typeof parsed?.headline === "string"
            ? parsed.headline
            : typeof parsed?.title === "string"
            ? parsed.title
            : article.title || "Untitled Rewrite",
        summary:
          typeof parsed?.summary === "string"
            ? parsed.summary
            : article.description || "",
        url: article.link,
        imageUrl: article.media_url,
      });

      const rewrite: RewritePayload = {
        headline:
          typeof parsed?.headline === "string"
            ? parsed.headline
            : typeof parsed?.title === "string"
            ? parsed.title
            : article.title || "Untitled Rewrite",
        summary:
          typeof parsed?.summary === "string"
            ? parsed.summary
            : article.description || "",
        body:
          typeof parsed?.body === "string"
            ? parsed.body
            : typeof parsed?.content === "string"
            ? parsed.content
            : raw,
        references: normalizeReferences(parsed?.references),
        social: normalizeSocial(parsed?.social, fallbackSocial),
        raw,
      };

      results.push({
        articleId: article.id,
        stream: article.stream,
        personaKey,
        original: {
          title: article.title,
          description: article.description,
          link: article.link,
          source: article.source,
          published_date: article.published_date,
        },
        rewrite,
      });
    }

    return { success: true, data: results };
  } catch (error) {
    const err = error as any;
    console.error("[admin/newsmesh] rewrite error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage ||
        err?.message ||
        "Unable to generate rewrites. Try again later.",
    };
  }
});
