import OpenAI from "openai";
import mustache from "mustache";
import {
  AI_PERSONA_SELECT,
  getServiceRoleClient,
} from "~/server/utils/aiBots";

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

const MIN_CONTENT_LENGTH = 200;
const MAX_CONTENT_LENGTH = 12_000;

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

const decodeEntities = (input: string) =>
  input
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");

const stripHtml = (html: string) => {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ");

  const blockBreaks = withoutScripts
    .replace(/<(\/)?(p|div|article|section|header|footer|main|br|hr)[^>]*>/gi, "\n")
    .replace(/<(\/)?(h1|h2|h3|h4|h5|h6|li|tr|td)[^>]*>/gi, "\n");

  const withoutTags = blockBreaks.replace(/<[^>]+>/g, " ");
  const decoded = decodeEntities(withoutTags);
  return decoded.replace(/\s+/g, " ").trim();
};

const extractTitle = (html: string) => {
  const ogMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  if (ogMatch?.[1]) return ogMatch[1].trim();
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) return titleMatch[1].trim();
  return null;
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
  url: string;
}): NonNullable<RewritePayload["social"]> => {
  const cleanHeadline = input.headline?.trim() || "New article";
  const cleanSummary = input.summary?.trim();
  const baseSummary = cleanSummary ? ` ${cleanSummary}` : "";
  const fbCaption = `${cleanHeadline}.${baseSummary}\n\n${input.url}`.trim();
  const igCaption = `${cleanHeadline}.${baseSummary}\n\n#news #update #story`;
  return {
    facebook: { caption: fbCaption, link: input.url },
    instagram: { caption: igCaption },
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
    userName: "Editor",
    userGender: "",
    userAge: "",
  });

  return `${rendered}

You are preparing quick rewrites for externally supplied news URLs. Emphasize clarity, credibility, and your persona's lens.`;
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  if (!config.OPENAI_API_KEY) {
    setResponseStatus(event, 500);
    return { success: false, error: "OPENAI_API_KEY is not configured" };
  }

  try {
    const body = (await readBody(event)) || {};
    const url = toSafeHttpUrl(body.url);
    const personaKey = String(body.personaKey || "").trim();
    const extraInstructions = String(body.instructions || "").trim();

    if (!url) {
      setResponseStatus(event, 400);
      return { success: false, error: "A valid URL is required." };
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

    const response = await fetch(url, {
      headers: { "User-Agent": "NewsmeshBot/1.0 (+https://imchatty.local)" },
    });

    if (!response.ok) {
      setResponseStatus(event, response.status || 500);
      return {
        success: false,
        error: `Unable to fetch the URL (status ${response.status}).`,
      };
    }

    const html = await response.text();
    const pageTitle = extractTitle(html);
    const textContent = stripHtml(html);

    if (!textContent || textContent.length < MIN_CONTENT_LENGTH) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: "The URL did not contain readable article content.",
      };
    }

    const truncatedContent = textContent.slice(0, MAX_CONTENT_LENGTH);
    const summary = truncatedContent.slice(0, 320);
    const domain = (() => {
      try {
        return new URL(url).hostname.replace(/^www\./, "");
      } catch {
        return null;
      }
    })();

    const systemPrompt = buildSystemPrompt(persona);

    const userPrompt = [
      `Rewrite the provided article text from your persona's perspective.`,
      `Return strict JSON: {"headline": string, "summary": string, "body": string, "references": [{"label": string, "url": string}], "social": {"facebook": {"caption": string, "link": string}, "instagram": {"caption": string}}}.`,
      `Facebook caption: 1-2 sentences + include the URL (either in caption or "link").`,
      `Instagram caption: 1-2 sentences, no link, add 3-6 relevant hashtags.`,
      `Body should be 3-5 short paragraphs in Markdown.`,
      `If the content is not understandable, respond with {"error":"UNREADABLE_CONTENT"}.`,
      extraInstructions ? `Editor notes: ${extraInstructions}` : null,
      `Source URL: ${url}`,
      domain ? `Source domain: ${domain}` : null,
      pageTitle ? `Source title: ${pageTitle}` : null,
      ``,
      `Extracted text (may be truncated):`,
      truncatedContent,
    ]
      .filter(Boolean)
      .join("\n");

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

    const aiResponse = await openai.chat.completions.create({
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

    const raw = aiResponse?.choices?.[0]?.message?.content ?? "";
    const parsed = sanitizeJsonResponse(raw);

    if (parsed?.error === "UNREADABLE_CONTENT") {
      setResponseStatus(event, 422);
      return {
        success: false,
        error: "The AI could not interpret the supplied URL content.",
      };
    }

    const references = normalizeReferences(parsed?.references, url, domain || "Source");

    const fallbackSocial = buildFallbackSocial({
      headline:
        typeof parsed?.headline === "string"
          ? parsed.headline
          : typeof parsed?.title === "string"
          ? parsed.title
          : pageTitle || "Untitled rewrite",
      summary:
        typeof parsed?.summary === "string"
          ? parsed.summary
          : summary || "",
      url,
    });

    const rewrite: RewritePayload = {
      headline:
        typeof parsed?.headline === "string"
          ? parsed.headline
          : typeof parsed?.title === "string"
          ? parsed.title
          : pageTitle || "Untitled rewrite",
      summary:
        typeof parsed?.summary === "string"
          ? parsed.summary
          : summary || "",
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
        sourceUrl: url,
        sourceTitle: pageTitle,
        sourceSummary: summary,
        sourceDomain: domain,
        personaKey,
        original: {
          title: pageTitle,
          description: summary,
          link: url,
          source: domain,
        },
        rewrite,
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/news-source] rewrite error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage ||
        err?.message ||
        "Unable to rewrite the supplied URL. Try again later.",
    };
  }
});
