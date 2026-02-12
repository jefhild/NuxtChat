import { getOpenAIClient } from "@/server/utils/openaiGateway";
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

const countSentences = (value: string) => {
  const matches = value.match(/[.!?。！？]+/g);
  return matches ? matches.length : 0;
};

const countParagraphs = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  let blocks = trimmed
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
  if (blocks.length <= 1) {
    blocks = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return blocks.length;
};

const assessRewriteQuality = (input: {
  parsed: any;
  sourceUrl: string;
  sourceLabel: string;
}) => {
  const headline =
    typeof input.parsed?.headline === "string"
      ? input.parsed.headline.trim()
      : typeof input.parsed?.title === "string"
      ? input.parsed.title.trim()
      : "";
  const summary =
    typeof input.parsed?.summary === "string"
      ? input.parsed.summary.trim()
      : "";
  const body =
    typeof input.parsed?.body === "string"
      ? input.parsed.body.trim()
      : typeof input.parsed?.content === "string"
      ? input.parsed.content.trim()
      : "";
  const references = normalizeReferences(
    input.parsed?.references,
    input.sourceUrl,
    input.sourceLabel
  );

  const issues: string[] = [];
  if (headline.length < 12) {
    issues.push("headline is too short");
  }
  const summarySentenceCount = countSentences(summary);
  if (summary.length < 80 || (summarySentenceCount < 2 && summary.length < 110)) {
    issues.push("summary should be two clear sentences");
  }
  const paragraphCount = countParagraphs(body);
  if (paragraphCount < 3 || paragraphCount > 5) {
    issues.push("body should be 3-5 paragraphs");
  }
  if (body.length < 280) {
    issues.push("body is too short");
  }
  if (references.length < 2) {
    issues.push("at least two references are required");
  }

  return { issues, headline, summary, body, references };
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

const DEFAULT_USER_INSTRUCTIONS = `
You are assisting the editors. Take the supplied article text and rewrite it from your persona's perspective.
The rewrite must:
- Introduce a new angle or deeper context that was absent from the source text.
- Cite at least two references, including the source URL and any relevant background material.
- Produce a body made of 3-5 short paragraphs formatted in Markdown.
- Include a short summary (2 sentences) and a fresh headline.
- Provide social captions as JSON: social.facebook.caption (1-2 sentences + URL), social.instagram.caption (1-2 sentences, 3-6 hashtags, no link).
- Write the rewrite in the same language as the source text.
`;
const HUMAN_TONE_INSTRUCTIONS = `
Write like a human editor, not a model:
- Vary sentence length and structure; avoid formulaic openers and closers.
- Prefer concrete, specific language over generic commentary.
- Avoid meta phrasing like "this article," "the piece," or "in conclusion."
- Do not overuse hedging ("may", "might", "could") unless the source warrants it.
- Keep the persona voice natural and distinct; no buzzwordy or overly polished phrasing.
`.trim();

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

    const baseInstructions = [
      DEFAULT_USER_INSTRUCTIONS.trim(),
      HUMAN_TONE_INSTRUCTIONS,
    ];
    if (extraInstructions) {
      baseInstructions.push(`Editor notes: ${extraInstructions}`);
    }

    const userPrompt = [
      baseInstructions.join("\n\n"),
      `Return strict JSON only (no surrounding text): {"headline": string, "summary": string, "body": string, "references": [{"label": string, "url": string}], "social": {"facebook": {"caption": string, "link": string}, "instagram": {"caption": string}}}.`,
      `If the content is not understandable, respond with {"error":"UNREADABLE_CONTENT"}.`,
      `Source URL: ${url}`,
      domain ? `Source domain: ${domain}` : null,
      pageTitle ? `Source title: ${pageTitle}` : null,
      ``,
      `Extracted text (may be truncated):`,
      truncatedContent,
    ]
      .filter(Boolean)
      .join("\n");

    if (!apiKey || !openai) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const maxTokens = Math.max(persona.max_response_tokens ?? 0, 1200);
    const requestRewrite = async (prompt: string) => {
      const aiResponse = await openai.chat.completions.create({
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
      const raw = aiResponse?.choices?.[0]?.message?.content ?? "";
      return { raw, parsed: sanitizeJsonResponse(raw) };
    };

    let aiResult = await requestRewrite(userPrompt);
    if (aiResult.parsed?.error === "UNREADABLE_CONTENT") {
      setResponseStatus(event, 422);
      return {
        success: false,
        error: "The AI could not interpret the supplied URL content.",
      };
    }

    let quality = assessRewriteQuality({
      parsed: aiResult.parsed,
      sourceUrl: url,
      sourceLabel: domain || "Source",
    });

    if (quality.issues.length) {
      const repairPrompt = `${userPrompt}

Your previous JSON response did not pass QA: ${quality.issues.join(
        "; "
      )}. Rewrite and return strict JSON only with high factual specificity, 3-5 markdown paragraphs, a two-sentence summary, and at least two references.`;
      aiResult = await requestRewrite(repairPrompt);
      if (aiResult.parsed?.error === "UNREADABLE_CONTENT") {
        setResponseStatus(event, 422);
        return {
          success: false,
          error: "The AI could not interpret the supplied URL content.",
        };
      }
      quality = assessRewriteQuality({
        parsed: aiResult.parsed,
        sourceUrl: url,
        sourceLabel: domain || "Source",
      });
    }

    if (quality.issues.length) {
      setResponseStatus(event, 422);
      return {
        success: false,
        error: "The AI response did not meet rewrite quality requirements.",
      };
    }

    const fallbackSocial = buildFallbackSocial({
      headline: quality.headline || pageTitle || "Untitled rewrite",
      summary: quality.summary || summary || "",
      url,
    });

    const rewrite: RewritePayload = {
      headline: quality.headline || pageTitle || "Untitled rewrite",
      summary: quality.summary || summary || "",
      body: quality.body,
      references: quality.references,
      social: normalizeSocial(aiResult.parsed?.social, fallbackSocial),
      raw: aiResult.raw,
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
