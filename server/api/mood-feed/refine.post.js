import OpenAI from "openai";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

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

  if (!response) {
    throw createError({ statusCode: 400, statusMessage: "Response required" });
  }

  if (!tone) {
    try {
      const supabase = await getServiceRoleClient(event);
      const { data } = await supabase
        .from("mood_feed_settings")
        .select("default_tone")
        .eq("id", 1)
        .maybeSingle();
      if (data?.default_tone) {
        tone = String(data.default_tone).trim().toLowerCase();
      }
    } catch (err) {
      console.warn("[mood-feed.refine] tone lookup failed:", err?.message || err);
    }
  }
  if (!tone) tone = "funny";

  const config = useRuntimeConfig(event);
  const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { refined: response.slice(0, 140) };
  }

  const openai = new OpenAI({ apiKey });
  const model = config.OPENAI_MODEL || "gpt-4o-mini";

  const sys = [
    "Rewrite the user's response into a very short, direct, interesting mood phrase.",
    "Preserve the core meaning and target; do not soften or change intent.",
    "Avoid cutesy metaphors, puns, or playful framing unless the tone explicitly calls for it.",
    "It must clearly answer the prompt but should not repeat the user's words.",
    "4-10 words max. Plain text only.",
    "Sound human and natural. Avoid AI-ish phrasing, formulaic patterns, or over-clever slogans.",
    "Prefer simple, specific, conversational wording over abstract or ornate phrasing.",
    "Avoid quotes, hashtags, emojis, and punctuation spam.",
    "If tone is 'serious', be blunt, plain, and literal (no jokes or whimsy).",
    `Language: ${locale}.`,
    `Tone: ${tone}.`,
  ].join("\n");

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
    return { refined };
  } catch (err) {
    console.warn("[mood-feed.refine] fallback:", err?.message || err);
    return { refined: response.slice(0, 140) };
  }
});
