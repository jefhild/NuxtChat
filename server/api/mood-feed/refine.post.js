import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { serverSupabaseUser } from "#supabase/server";
import {
  DEFAULT_MOOD_FEED_REFINE_PROMPT,
  DEFAULT_MOOD_FEED_TONE,
  fillMoodFeedRefinePromptTemplate,
  loadMoodFeedSettings,
} from "~/server/utils/moodFeedSettings";

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const body = (await readBody(event)) || {};
  const prompt = String(body.prompt || "").trim();
  const response = String(body.response || "").trim();
  const locale = normalizeLocale(body.locale || "en");
  let tone = String(body.tone || "").trim().toLowerCase();
  let refinePromptTemplate = "";

  if (!response) {
    throw createError({ statusCode: 400, statusMessage: "Response required" });
  }

  if (!tone || !refinePromptTemplate) {
    try {
      const settings = await loadMoodFeedSettings(event);
      if (!tone) {
        tone = String(settings?.default_tone || "").trim().toLowerCase();
      }
      if (!refinePromptTemplate) {
        refinePromptTemplate = settings?.refine_prompt_template || "";
      }
    } catch (err) {
      console.warn(
        "[mood-feed.refine] settings lookup failed:",
        err?.message || err
      );
    }
  }
  if (!tone) tone = DEFAULT_MOOD_FEED_TONE;
  if (!refinePromptTemplate) {
    refinePromptTemplate = DEFAULT_MOOD_FEED_REFINE_PROMPT;
  }

  const config = useRuntimeConfig(event);
  const { client: openai, apiKey, model } = getOpenAIClient({
    runtimeConfig: config,
    model: config.OPENAI_MODEL || "gpt-4o-mini",
  });
  if (!apiKey || !openai) {
    return { refined: response.slice(0, 140), tone };
  }

  const sys = fillMoodFeedRefinePromptTemplate({
    template: refinePromptTemplate,
    locale,
    tone,
  });

  const userPrompt = [
    prompt ? `Prompt: ${prompt}` : "",
    `User response: ${response}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const resp = await openai.chat.completions.create({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt },
      ],
    });

    const refined =
      String(resp?.choices?.[0]?.message?.content || "").trim() ||
      response.slice(0, 140);
    return { refined, tone };
  } catch (err) {
    console.warn("[mood-feed.refine] fallback:", err?.message || err);
    return { refined: response.slice(0, 140), tone };
  }
});
