import { getOpenAIClient } from "@/server/utils/openaiGateway";

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const CYRILLIC_RE = /[\u0400-\u04ff\u0500-\u052f]/;
const FRENCH_RE = /[àâçéèêëîïôûùüÿœ]/i;

const normalizeLocale = (value) => {
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

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = (await readBody(event)) || {};
    const text = String(body.text || "").trim();
    const targetLocale = normalizeLocale(body.targetLocale);
    const sourceLocaleHint = normalizeLocale(body.sourceLocaleHint);

    if (!text || !targetLocale) {
      setResponseStatus(event, 400);
      return { ok: false, error: "Missing translation parameters." };
    }

    const fallbackSource = sourceLocaleHint || detectLocaleFallback(text);

    const { client: openai, apiKey, model } = getOpenAIClient({
      runtimeConfig: config,
      model: config.OPENAI_MODEL || "gpt-4.1-mini",
    });

    if (!apiKey || !openai) {
      return {
        ok: true,
        sourceLocale: fallbackSource,
        translatedText: text,
        engine: "fallback",
      };
    }

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
            `Target language: ${targetLocale}.`,
            sourceLocaleHint ? `Source hint: ${sourceLocaleHint}.` : "",
            "Text:",
            text,
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
        : text;

    return {
      ok: true,
      sourceLocale,
      translatedText: sourceLocale === targetLocale ? text : translatedText,
      engine: "openai",
    };
  } catch (error) {
    console.error("[chat.translate] error:", error);
    setResponseStatus(event, 500);
    return { ok: false, error: "Unable to translate message." };
  }
});
