import { defineEventHandler, readBody } from "h3";
import { getOpenAIClient } from "@/server/utils/openaiGateway";
import { LIVE_MOOD_TAXONOMY } from "@/server/utils/botPlatform";

const FALLBACKS = {
  emotion: "calm",
  intent: "casual_chat",
  energy: "normal",
  privacy: "private_matching_only",
  time_horizon: "right_now",
};

function cleanJsonResponse(value: string) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1).trim();
  }

  return raw;
}

function fallbackInfer(text: string) {
  const source = String(text || "").toLowerCase();
  const emotion =
    /lonely|alone|isolated/.test(source)
      ? "lonely"
      : /annoy|mad|angry|irritat/.test(source)
      ? "annoyed"
      : /overwhelm|stressed|too much|anxious/.test(source)
      ? "overwhelmed"
      : /playful|fun|silly|joke/.test(source)
      ? "playful"
      : /curious|wonder|interested/.test(source)
      ? "curious"
      : /hope|optimis/.test(source)
      ? "hopeful"
      : /sad|down|depress/.test(source)
      ? "sad"
      : FALLBACKS.emotion;

  const intent =
    /listen|hear someone out/.test(source)
      ? "listen"
      : /vent|be heard|get this out/.test(source)
      ? "be_heard"
      : /distract|take my mind off/.test(source)
      ? "distract_me"
      : /deep|serious|meaningful/.test(source)
      ? "deep_talk"
      : /similar|same vibe|same mood/.test(source)
      ? "meet_someone_similar"
      : FALLBACKS.intent;

  const energy =
    /drained|tired|exhausted|low energy/.test(source)
      ? "drained"
      : /wired|amped|hyper|buzzing/.test(source)
      ? "wired"
      : FALLBACKS.energy;

  const privacy = /public|post it/.test(source)
    ? "public_mood_post"
    : FALLBACKS.privacy;

  const time_horizon = /lately|these days|generally/.test(source)
    ? "generally_lately"
    : /today|tonight/.test(source)
    ? "today"
    : FALLBACKS.time_horizon;

  return {
    emotion,
    intent,
    energy,
    privacy,
    time_horizon,
    confidence: 0.45,
  };
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const responseText = String(body?.text || "").trim();
  const locale = String(body?.locale || "en");

  if (!responseText) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing mood text",
    });
  }

  const config = useRuntimeConfig(event);
  const { client: openai, apiKey, model: defaultModel } = getOpenAIClient({
    runtimeConfig: config,
  });

  let inferred = fallbackInfer(responseText);

  if (apiKey && openai) {
    try {
      const prompt = `
Classify the user's current chat headspace into this exact taxonomy.

emotion: ${LIVE_MOOD_TAXONOMY.emotions.join(", ")}
intent: ${LIVE_MOOD_TAXONOMY.intents.join(", ")}
energy: ${LIVE_MOOD_TAXONOMY.energy.join(", ")}
privacy: ${LIVE_MOOD_TAXONOMY.privacy.join(", ")}
time_horizon: ${LIVE_MOOD_TAXONOMY.timeHorizon.join(", ")}

Return strict JSON with keys:
emotion, intent, energy, privacy, time_horizon, confidence, free_text_refined

Rules:
- Pick exactly one value for each taxonomy field.
- confidence must be a number between 0 and 1.
- free_text_refined should be a concise paraphrase of the user's headspace in the same language.
- Language: ${locale}.
- User text: ${responseText}
`.trim();

      const resp = await openai.chat.completions.create({
        model:
          config.OPENAI_MODEL ||
          process.env.OPENAI_MODEL ||
          defaultModel ||
          "gpt-4.1-mini",
        messages: [{ role: "user", content: prompt }],
      });

      const content = String(resp.choices?.[0]?.message?.content || "").trim();
      const parsed = JSON.parse(cleanJsonResponse(content));
      inferred = {
        emotion: LIVE_MOOD_TAXONOMY.emotions.includes(parsed?.emotion)
          ? parsed.emotion
          : inferred.emotion,
        intent: LIVE_MOOD_TAXONOMY.intents.includes(parsed?.intent)
          ? parsed.intent
          : inferred.intent,
        energy: LIVE_MOOD_TAXONOMY.energy.includes(parsed?.energy)
          ? parsed.energy
          : inferred.energy,
        privacy: LIVE_MOOD_TAXONOMY.privacy.includes(parsed?.privacy)
          ? parsed.privacy
          : inferred.privacy,
        time_horizon: LIVE_MOOD_TAXONOMY.timeHorizon.includes(parsed?.time_horizon)
          ? parsed.time_horizon
          : inferred.time_horizon,
        confidence:
          Number.isFinite(Number(parsed?.confidence)) &&
          Number(parsed.confidence) >= 0 &&
          Number(parsed.confidence) <= 1
            ? Number(parsed.confidence)
            : inferred.confidence,
        free_text_refined:
          String(parsed?.free_text_refined || "").trim() || responseText,
      };
    } catch (err) {
      console.warn("[live-mood] infer fallback:", err);
      inferred = {
        ...inferred,
        free_text_refined: responseText,
      };
    }
  } else {
    inferred = {
      ...inferred,
      free_text_refined: responseText,
    };
  }

  return {
    ok: true,
    state: inferred,
  };
});
