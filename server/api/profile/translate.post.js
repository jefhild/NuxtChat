import OpenAI from "openai";
import { getServiceRoleClient } from "~/server/utils/aiBots";

const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return code.split("-")[0] || null;
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

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const body = (await readBody(event)) || {};
    const userId = String(body.userId || "").trim();
    const displayname = String(body.displayname || "").trim();
    const bio = String(body.bio || "").trim();
    const tagline = String(body.tagline || "").trim();
    const hasTagline = Boolean(tagline);
    const sourceLocale = normalizeLocale(body.sourceLocale) || "en";
    const targetLocalesRaw = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : [];
    let targetLocales = Array.from(
      new Set(targetLocalesRaw.map(normalizeLocale).filter(Boolean))
    ).filter((locale) => locale !== sourceLocale);

    if (!userId || (!displayname && !bio && !tagline)) {
      setResponseStatus(event, 400);
      return { ok: false, error: "Missing translation parameters." };
    }

    const supabase = await getServiceRoleClient(event);

    const basePayload = {
      user_id: userId,
      locale: sourceLocale,
      displayname: displayname || null,
      bio: bio || null,
      tagline: hasTagline ? tagline : null,
      source_locale: sourceLocale,
      provider: "original",
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("profile_translations")
      .upsert(basePayload, { onConflict: "user_id,locale" });

    if (!targetLocales.length) {
      targetLocales = ["en", "fr", "ru", "zh"].filter(
        (locale) => locale !== sourceLocale
      );
    }

    const today = new Date().toISOString().slice(0, 10);
    const { data: usage } = await supabase
      .from("profile_translation_usage")
      .select("count")
      .eq("user_id", userId)
      .eq("day", today)
      .maybeSingle();
    const used = Number(usage?.count || 0);
    if (used >= 5) {
      setResponseStatus(event, 429);
      return { ok: false, error: "Translation limit reached." };
    }

    if (!config.OPENAI_API_KEY || !targetLocales.length) {
      return { ok: true, translated: [] };
    }

    await supabase
      .from("profile_translation_usage")
      .upsert(
        {
          user_id: userId,
          day: today,
          count: used + 1,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,day" }
      );

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const model = config.OPENAI_MODEL || "gpt-4.1-mini";

    const translated = [];

    for (const targetLocale of targetLocales) {
      const userPrompt = [
        `Translate from ${sourceLocale} to ${targetLocale}.`,
        "Return JSON only with keys: displayname, bio, tagline.",
        "Keep the displayname short, no quotes.",
        displayname ? `Display name: ${displayname}` : "",
        bio ? `Bio: ${bio}` : "",
        hasTagline ? `Tagline: ${tagline}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You translate short profile text. Return JSON only with keys: displayname, bio, tagline.",
          },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content || "";
      const parsed = sanitizeJsonResponse(content) || {};

      const translatedPayload = {
        user_id: userId,
        locale: targetLocale,
        displayname:
          typeof parsed.displayname === "string"
            ? parsed.displayname.trim()
            : displayname,
        bio: typeof parsed.bio === "string" ? parsed.bio.trim() : bio,
        tagline:
          hasTagline && typeof parsed.tagline === "string"
            ? parsed.tagline.trim()
            : hasTagline
            ? tagline
            : null,
        source_locale: sourceLocale,
        provider: "openai",
        translated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (
        (translatedPayload.displayname && CJK_RE.test(translatedPayload.displayname)) ||
        (translatedPayload.bio && CJK_RE.test(translatedPayload.bio))
      ) {
        translatedPayload.provider = "openai_retry";
      }

      await supabase
        .from("profile_translations")
        .upsert(translatedPayload, { onConflict: "user_id,locale" });

      translated.push(targetLocale);
    }

    return { ok: true, translated };
  } catch (error) {
    console.error("[profile.translate] error:", error);
    setResponseStatus(event, 500);
    return { ok: false, error: "Unable to translate profile." };
  }
});
