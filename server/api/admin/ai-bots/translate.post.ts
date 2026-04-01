import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAdmin } from "~/server/utils/adminAuth";

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const CYRILLIC_RE = /[\u0400-\u04ff\u0500-\u052f]/;

const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];

const normalizeLocale = (value: string | null | undefined) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return code.split("-")[0] || null;
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
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const config = useRuntimeConfig();
    const body = (await readBody(event)) || {};

    const profileUserId = String(body.profileUserId || "").trim();
    const angle = String(body.angle || "").trim();
    const sourceLocaleRaw = normalizeLocale(body.sourceLocale) || "en";

    if (!profileUserId || !angle) {
      setResponseStatus(event, 400);
      return { ok: false, error: "Missing profileUserId or angle text." };
    }

    const inferredLocale = CJK_RE.test(angle)
      ? "zh"
      : CYRILLIC_RE.test(angle)
      ? "ru"
      : "en";
    const sourceLocale =
      inferredLocale !== sourceLocaleRaw &&
      (sourceLocaleRaw === "zh" ||
        sourceLocaleRaw === "ru" ||
        (sourceLocaleRaw === "en" && inferredLocale !== "en"))
        ? inferredLocale
        : sourceLocaleRaw;

    const targetLocales = SUPPORTED_LOCALES.filter((l) => l !== sourceLocale);

    const { client: openai, apiKey, model } = getOpenAIClient({
      runtimeConfig: config,
      model: config.OPENAI_MODEL || "gpt-4.1-mini",
    });

    if (!apiKey || !openai) {
      setResponseStatus(event, 400);
      return { ok: false, error: "OPENAI_API_KEY is not configured." };
    }

    // Upsert the source locale row first.
    await supabase.from("profile_translations").upsert(
      {
        user_id: profileUserId,
        locale: sourceLocale,
        angle: angle,
        source_locale: sourceLocale,
        provider: "original",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,locale", ignoreDuplicates: false }
    );

    const translated: string[] = [];

    for (const targetLocale of targetLocales) {
      const userPrompt = [
        `Translate from ${sourceLocale} to ${targetLocale}.`,
        'Return JSON only with key: "angle".',
        `Angle/summary: ${angle}`,
      ].join("\n");

      const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              'You translate a short persona description for an AI character. Preserve personality and tone. Return JSON only with key: "angle".',
          },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content || "";
      const parsed = sanitizeJsonResponse(content) || {};

      await supabase.from("profile_translations").upsert(
        {
          user_id: profileUserId,
          locale: targetLocale,
          angle:
            typeof parsed.angle === "string" && parsed.angle.trim()
              ? parsed.angle.trim()
              : angle,
          source_locale: sourceLocale,
          provider: "openai",
          translated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,locale", ignoreDuplicates: false }
      );

      translated.push(targetLocale);
    }

    return { ok: true, translated, sourceLocale };
  } catch (error: any) {
    console.error("[admin/ai-bots/translate] error:", error);
    setResponseStatus(event, 500);
    return { ok: false, error: error?.message || "Unable to translate persona." };
  }
});
