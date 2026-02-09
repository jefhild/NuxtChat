import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  ensureAnonCaptcha,
  ensureMoodFeedAuthor,
  enforceAnonLimit,
} from "~/server/utils/moodFeedGuards";
import { moderateMoodFeedText } from "~/server/utils/moodFeedModeration";

const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

const clampText = (value, max = 280) =>
  String(value || "").trim().slice(0, max);

const translateText = async ({ openai, model, sourceLocale, targetLocale, text }) => {
  const prompt = [
    `Translate from ${sourceLocale} to ${targetLocale}.`,
    "Return plain text only.",
    `Text: ${text}`,
  ].join("\n");
  const resp = await openai.chat.completions.create({
    model,
    temperature: 0.2,
    messages: [
      {
        role: "system",
        content: "You translate short text. Return plain text only.",
      },
      { role: "user", content: prompt },
    ],
  });
  return String(resp?.choices?.[0]?.message?.content || "").trim();
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const body = (await readBody(event)) || {};
  const promptText = clampText(body.promptText, 280);
  const promptKey = body.promptKey ? String(body.promptKey).trim() : null;
  const originalText = clampText(body.originalText, 800);
  const refinedText = clampText(body.refinedText, 280);
  const captchaToken = String(body.captchaToken || "").trim() || null;
  const sourceLocale = normalizeLocale(body.locale || "en");

  if (!refinedText) {
    throw createError({
      statusCode: 400,
      statusMessage: "refinedText required",
    });
  }

  const supabase = await getServiceRoleClient(event);

  await ensureAnonCaptcha({ event, supabase, user, captchaToken });
  await enforceAnonLimit({
    supabase,
    user,
    table: "mood_feed_entries",
    limit: 4,
    limitType: "entries",
  });
  await ensureMoodFeedAuthor(supabase, user);

  const moderation = await moderateMoodFeedText({
    event,
    text: refinedText || originalText,
  });
  const status = moderation.allowed ? "published" : "pending_validation";

  const entryPayload = {
    user_id: user.id,
    prompt_key: promptKey || null,
    prompt_text: promptText || null,
    original_text: originalText || null,
    refined_text: refinedText,
    source_locale: sourceLocale,
    status,
  };

  const { data: inserted, error } = await supabase
    .from("mood_feed_entries")
    .insert(entryPayload)
    .select("id")
    .maybeSingle();
  if (error || !inserted?.id) {
    throw createError({
      statusCode: 500,
      statusMessage: error?.message || "Insert failed",
    });
  }

  const entryId = inserted.id;
  if (status === "published") {
    const baseTranslation = {
      entry_id: entryId,
      locale: sourceLocale,
      refined_text: refinedText,
      source_locale: sourceLocale,
      provider: "original",
      translated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await supabase
      .from("mood_feed_entry_translations")
      .upsert(baseTranslation, { onConflict: "entry_id,locale" });

    const config = useRuntimeConfig(event);
    const { client: openai, apiKey, model } = getOpenAIClient({
      runtimeConfig: config,
      model: config.OPENAI_MODEL || "gpt-4o-mini",
    });
    if (apiKey && openai) {
      const targets = SUPPORTED_LOCALES.filter((l) => l !== sourceLocale);
      for (const targetLocale of targets) {
        try {
          const translated = await translateText({
            openai,
            model,
            sourceLocale,
            targetLocale,
            text: refinedText,
          });
          if (!translated) continue;
          await supabase.from("mood_feed_entry_translations").upsert(
            {
              entry_id: entryId,
              locale: targetLocale,
              refined_text: translated,
              source_locale: sourceLocale,
              provider: "openai",
              translated_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: "entry_id,locale" }
          );
        } catch (err) {
          console.warn("[mood-feed.translate] skip:", err?.message || err);
        }
      }
    }
  }

  return { ok: true, entryId, status };
});
