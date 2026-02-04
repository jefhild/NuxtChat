import { getOpenAIClient } from "@/server/utils/openaiGateway";
import mustache from "mustache";
import {
  AI_PERSONA_SELECT,
  getServiceRoleClient,
} from "~/server/utils/aiBots";
import { buildManualPrompt } from "~/server/utils/manualRewrite";

type RewriteReference = { label: string; url?: string | null };
type RewritePayload = {
  headline: string;
  summary: string;
  body: string;
  references: RewriteReference[];
  social?: {
    facebook: { caption: string; link?: string | null };
    instagram: { caption: string; image_url?: string | null };
  };
  raw?: string;
};

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

const sanitizeJsonResponse = (input = "") => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fencedMatch = trimmed.match(/```json[\s\S]*?```/i);
  const block = fencedMatch ? fencedMatch[0] : trimmed;
  const cleaned = block
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  const tryParse = (value: string) => {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const direct = tryParse(cleaned);
  if (direct) return direct;

  const firstOpen = cleaned.indexOf("{");
  const lastClose = cleaned.lastIndexOf("}");
  if (firstOpen !== -1 && lastClose > firstOpen) {
    const candidate = cleaned.slice(firstOpen, lastClose + 1);
    const extracted = tryParse(candidate);
    if (extracted) return extracted;
  }

  return null;
};

const buildFallbackSocial = (input: {
  headline: string;
  summary: string;
  url: string | null;
}): NonNullable<RewritePayload["social"]> => {
  const cleanHeadline = input.headline?.trim() || "New article";
  const cleanSummary = input.summary?.trim();
  const baseSummary = cleanSummary ? ` ${cleanSummary}` : "";
  const linkText = input.url ? `\n\n${input.url}` : "";
  const fbCaption = `${cleanHeadline}.${baseSummary}${linkText}`.trim();
  const igCaption = `${cleanHeadline}.${baseSummary}\n\n#news #update #story`;
  return {
    facebook: { caption: fbCaption, link: input.url },
    instagram: { caption: igCaption, image_url: null },
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

const normalizeReferences = (
  refs: unknown,
  sourceUrl: string,
  sourceLabel: string
): RewriteReference[] => {
  const entries = Array.isArray(refs) ? refs : refs ? [refs] : [];
  const base: RewriteReference[] = [
    {
      label: sourceLabel || "Source",
      url: sourceUrl,
    },
  ];

  const normalized = entries
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
        return { label: label || url || sourceLabel, url };
      }
      return null;
    })
    .filter((entry): entry is RewriteReference => Boolean(entry));

  const dedup = new Map<string, RewriteReference>();
  [...base, ...normalized].forEach((ref) => {
    const key = (ref.url || ref.label || "").toLowerCase();
    if (!key) return;
    if (!dedup.has(key)) dedup.set(key, ref);
  });

  return Array.from(dedup.values());
};

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
  const { client: openai, apiKey } = getOpenAIClient({
    runtimeConfig: config,
  });
  if (!config.OPENAI_API_KEY) {
    setResponseStatus(event, 500);
    return { success: false, error: "OPENAI_API_KEY is not configured" };
  }

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
    const personaKey = String(body.personaKey || "").trim();
    const promptOverride = normalizeText(body.promptOverride);

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

    const domain = (() => {
      try {
        return new URL(link).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })();

    const sourceLabel = source || domain || "Source";
    const summaryFallback = summary || articleBody.slice(0, 320);

    const prompt =
      promptOverride ||
      (
        await buildManualPrompt({
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
        })
      ).prompt;

    if (!apiKey || !openai) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    const systemPrompt = buildSystemPrompt(persona);

    const maxTokens = Math.max(persona.max_response_tokens ?? 0, 1200);
    const response = await openai.chat.completions.create({
      model: persona.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: persona.temperature ?? 0.7,
      top_p: persona.top_p ?? 1,
      presence_penalty: persona.presence_penalty ?? 0,
      frequency_penalty: persona.frequency_penalty ?? 0,
      max_tokens: maxTokens,
    });

    const raw = response?.choices?.[0]?.message?.content ?? "";
    const parsed = sanitizeJsonResponse(raw);

    const references = normalizeReferences(parsed?.references, link, sourceLabel);

    const fallbackSocial = buildFallbackSocial({
      headline:
        typeof parsed?.headline === "string"
          ? parsed.headline
          : typeof parsed?.title === "string"
          ? parsed.title
          : title,
      summary:
        typeof parsed?.summary === "string"
          ? parsed.summary
          : summaryFallback || "",
      url: link,
    });

    const rewrite: RewritePayload = {
      headline:
        typeof parsed?.headline === "string"
          ? parsed.headline
          : typeof parsed?.title === "string"
          ? parsed.title
          : title,
      summary:
        typeof parsed?.summary === "string"
          ? parsed.summary
          : summaryFallback || "",
      body:
        typeof parsed?.body === "string"
          ? parsed.body
          : typeof parsed?.content === "string"
          ? parsed.content
          : raw,
      references,
      social: normalizeSocial(parsed?.social, fallbackSocial),
      raw,
    };

    return {
      success: true,
      data: {
        sourceUrl: link,
        sourceTitle: title,
        sourceSummary: summaryFallback,
        sourceDomain: domain,
        personaKey,
        original: {
          title,
          description: summary,
          link,
          source: sourceLabel,
          published_date: publishedDate,
        },
        rewrite,
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/news-source] manual rewrite error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage ||
        err?.message ||
        "Unable to rewrite the supplied content. Try again later.",
    };
  }
});
