import { readBody } from "h3";
import { ensureAdmin } from "@/server/utils/adminAuth";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import { buildLanguageLearningPayload } from "@/server/utils/languageLearning";

const EMOTIONS = ["lonely", "calm", "annoyed", "overwhelmed", "playful", "curious", "hopeful", "sad"];
const INTENTS = ["be_heard", "listen", "distract_me", "deep_talk", "casual_chat", "meet_someone_similar"];
const ENERGY = ["drained", "normal", "wired"];
const PRIVACY = ["public_mood_post", "private_matching_only"];
const TIME_HORIZON = ["right_now", "today", "generally_lately"];

const normalize = (value: unknown, allowed: string[]): string | null => {
  const v = String(value || "").trim().toLowerCase();
  return allowed.includes(v) ? v : null;
};

export default defineEventHandler(async (event) => {
  const supabase = await getServiceRoleClient(event);
  await ensureAdmin(event, supabase);

  const body = await readBody(event);
  const botUserId = String(body?.botUserId || "").trim();

  // clearAll doesn't target a specific bot
  if (!body?.clearAll && !botUserId) {
    throw createError({ statusCode: 400, statusMessage: "Missing botUserId" });
  }

  if (body?.clearAll) {
    // Fetch all active AI persona profile IDs
    const { data: personas, error: personasError } = await supabase
      .from("ai_personas")
      .select("profile_user_id")
      .eq("is_active", true)
      .not("profile_user_id", "is", null);
    if (personasError) throw createError({ statusCode: 500, statusMessage: personasError.message });

    const botIds = (personas || []).map((p: any) => p.profile_user_id).filter(Boolean);
    if (botIds.length > 0) {
      const [intakesResult, moodResult] = await Promise.all([
        supabase.from("match_intakes").delete().in("user_id", botIds),
        supabase.from("live_mood_states").delete().in("user_id", botIds),
      ]);
      if (intakesResult.error) throw createError({ statusCode: 500, statusMessage: intakesResult.error.message });
      if (moodResult.error) throw createError({ statusCode: 500, statusMessage: moodResult.error.message });
    }
    return { ok: true, clearedAll: true, count: botIds.length };
  }

  if (body?.clear) {
    const [intakesResult, moodResult] = await Promise.all([
      supabase.from("match_intakes").delete().eq("user_id", botUserId),
      supabase.from("live_mood_states").delete().eq("user_id", botUserId),
    ]);
    if (intakesResult.error) throw createError({ statusCode: 500, statusMessage: intakesResult.error.message });
    if (moodResult.error) throw createError({ statusCode: 500, statusMessage: moodResult.error.message });
    return { ok: true, cleared: true };
  }

  const emotion = normalize(body?.emotion, EMOTIONS);
  const intent = normalize(body?.intent, INTENTS);
  const energy = normalize(body?.energy, ENERGY);
  const privacy = normalize(body?.privacy, PRIVACY) ?? "private_matching_only";
  const time_horizon = normalize(body?.timeHorizon, TIME_HORIZON) ?? "right_now";
  const free_text_raw = String(body?.freeText || "").trim() || null;
  const languageLearning = buildLanguageLearningPayload(body);

  const now = new Date();
  const expires_at = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  const { error: moodError } = await supabase
    .from("live_mood_states")
    .upsert(
      {
        user_id: botUserId,
        emotion,
        intent,
        energy,
        privacy,
        time_horizon,
        free_text_raw,
        source_type: "self_selected",
        source_persona: "admin-tester",
        confidence: 1.0,
        captured_at: now.toISOString(),
        expires_at,
        updated_at: now.toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (moodError) {
    throw createError({ statusCode: 500, statusMessage: moodError.message });
  }

  const { error: intakeError } = await supabase.from("match_intakes").insert({
    user_id: botUserId,
    emotion,
    intent,
    energy,
    privacy,
    time_horizon,
    free_text_raw,
    source_persona: "admin-tester",
    confidence: 1.0,
    ...languageLearning,
  });

  if (intakeError) {
    throw createError({ statusCode: 500, statusMessage: intakeError.message });
  }

  return { ok: true };
});
