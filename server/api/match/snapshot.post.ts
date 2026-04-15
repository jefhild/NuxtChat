import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import { inferTopicHint } from "@/server/utils/botPlatform";
import { buildLanguageLearningPayload } from "@/server/utils/languageLearning";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const supabase = await getServiceRoleClient(event);
  const body = (await readBody(event).catch(() => null)) || {};
  const languageLearning = buildLanguageLearningPayload(body);

  const { data: liveState } = await supabase
    .from("live_mood_states")
    .select("emotion, intent, energy, privacy, time_horizon, free_text_raw, free_text_refined, source_persona, confidence")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!liveState) {
    return { ok: false, reason: "no_mood_state" };
  }

  const topicHint = inferTopicHint(liveState.free_text_raw);

  const { data: intake, error: intakeErr } = await supabase
    .from("match_intakes")
    .insert({
      user_id:           user.id,
      emotion:           liveState.emotion,
      intent:            liveState.intent,
      energy:            liveState.energy,
      privacy:           liveState.privacy,
      time_horizon:      liveState.time_horizon,
      free_text_raw:     liveState.free_text_raw,
      free_text_refined: liveState.free_text_refined,
      confidence:        liveState.confidence,
      topic_hint:        topicHint,
      source_persona:    liveState.source_persona,
      ...languageLearning,
    })
    .select("id")
    .maybeSingle();

  if (intakeErr) {
    throw createError({ statusCode: 500, statusMessage: intakeErr.message });
  }

  if (intake?.id) {
    // Cancel any existing pending request, then queue a fresh one
    await supabase
      .from("match_requests")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    await supabase
      .from("match_requests")
      .insert({
        user_id:           user.id,
        intake_id:         intake.id,
        status:            "pending",
        allow_ai_fallback: true,
        ...languageLearning,
      });
  }

  return { ok: true, intake_id: intake?.id ?? null };
});
