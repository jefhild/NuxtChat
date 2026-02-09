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
  const entryId = String(body.entryId || "").trim();
  const replyToId = body.replyToId ? String(body.replyToId).trim() : null;
  const content = clampText(body.content, 400);
  const captchaToken = String(body.captchaToken || "").trim() || null;
  const sourceLocale = normalizeLocale(body.locale || "en");

  if (!entryId || !content) {
    throw createError({ statusCode: 400, statusMessage: "entryId and content required" });
  }

  const supabase = await getServiceRoleClient(event);

  await ensureAnonCaptcha({ event, supabase, user, captchaToken });
  await enforceAnonLimit({
    supabase,
    user,
    table: "mood_feed_replies",
    limit: 4,
    limitType: "replies",
  });
  await ensureMoodFeedAuthor(supabase, user);

  const moderation = await moderateMoodFeedText({ event, text: content });
  const status = moderation.allowed ? "published" : "pending_validation";

  const { data: inserted, error } = await supabase
    .from("mood_feed_replies")
    .insert({
      entry_id: entryId,
      user_id: user.id,
      reply_to_id: replyToId,
      content,
      source_locale: sourceLocale,
      status,
    })
    .select("id")
    .maybeSingle();
  if (error || !inserted?.id) {
    throw createError({ statusCode: 500, statusMessage: error?.message || "Insert failed" });
  }

  const replyId = inserted.id;
  if (status === "published") {
    await supabase.from("mood_feed_reply_translations").upsert(
      {
        reply_id: replyId,
        locale: sourceLocale,
        content,
        source_locale: sourceLocale,
        provider: "original",
        translated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "reply_id,locale" }
    );
  }

  const config = useRuntimeConfig(event);
  const { client: openai, apiKey, model } = getOpenAIClient({
    runtimeConfig: config,
    model: config.OPENAI_MODEL || "gpt-4o-mini",
  });
  if (status === "published" && apiKey && openai) {
    const targets = SUPPORTED_LOCALES.filter((l) => l !== sourceLocale);
    for (const targetLocale of targets) {
      try {
        const translated = await translateText({
          openai,
          model,
          sourceLocale,
          targetLocale,
          text: content,
        });
        if (!translated) continue;
        await supabase.from("mood_feed_reply_translations").upsert(
          {
            reply_id: replyId,
            locale: targetLocale,
            content: translated,
            source_locale: sourceLocale,
            provider: "openai",
            translated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "reply_id,locale" }
        );
      } catch (err) {
        console.warn("[mood-feed.reply.translate] skip:", err?.message || err);
      }
    }
  }

  return { ok: true, replyId, status };
});
