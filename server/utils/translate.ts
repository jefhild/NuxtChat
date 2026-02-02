import OpenAI from "openai";

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const CYRILLIC_RE = /[\u0400-\u04ff\u0500-\u052f]/;
const FRENCH_RE = /[àâçéèêëîïôûùüÿœ]/i;

export const normalizeLocale = (value: string | null | undefined) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return code.split("-")[0] || null;
};

const detectLocaleFallback = (text = "") => {
  if (CJK_RE.test(text)) return "zh";
  if (CYRILLIC_RE.test(text)) return "ru";
  if (FRENCH_RE.test(text)) return "fr";
  return "en";
};

const sanitizeJsonResponse = (input = "") => {
  const trimmed = String(input || "").trim();
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

export const translateText = async ({
  text,
  targetLocale,
  sourceLocaleHint,
  config,
}: {
  text: string;
  targetLocale: string;
  sourceLocaleHint?: string | null;
  config: any;
}) => {
  const trimmed = String(text || "").trim();
  const normalizedTarget = normalizeLocale(targetLocale);
  const normalizedHint = normalizeLocale(sourceLocaleHint || null);

  if (!trimmed || !normalizedTarget) {
    return {
      ok: false,
      sourceLocale: normalizedHint || "en",
      translatedText: trimmed,
      engine: "invalid",
    };
  }

  const fallbackSource = normalizedHint || detectLocaleFallback(trimmed);

  if (!config?.OPENAI_API_KEY) {
    return {
      ok: true,
      sourceLocale: fallbackSource,
      translatedText: trimmed,
      engine: "fallback",
    };
  }

  const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
  const model = config.OPENAI_MODEL || "gpt-4.1-mini";

  const response = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content:
          "Detect the source language and translate to the target language. Return JSON only with keys: source_language, translated_text. Use language codes: en, fr, ru, zh.",
      },
      {
        role: "user",
        content: [
          `Target language: ${normalizedTarget}.`,
          normalizedHint ? `Source hint: ${normalizedHint}.` : "",
          "Text:",
          trimmed,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ],
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = sanitizeJsonResponse(content) || {};
  const sourceLocale =
    normalizeLocale(parsed.source_language) || fallbackSource || "en";
  const translatedText =
    typeof parsed.translated_text === "string" && parsed.translated_text.trim()
      ? parsed.translated_text.trim()
      : trimmed;

  return {
    ok: true,
    sourceLocale,
    translatedText: sourceLocale === normalizedTarget ? trimmed : translatedText,
    engine: "openai",
  };
};
