import { defineEventHandler, readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import {
  BOT_CAPABILITIES,
  choosePostOnboardingPersona,
  executeBotCapability,
  inferTopicHint,
} from "@/server/utils/botPlatform";
import { getServiceRoleClient } from "@/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const persona = body?.personaKey
    ? { persona_key: body.personaKey }
    : await choosePostOnboardingPersona(event, { targetUserId: user.id });

  if (!persona?.persona_key) {
    throw createError({
      statusCode: 404,
      statusMessage: "No handoff persona available",
    });
  }

  const result = await executeBotCapability({
    event,
    actorPersona: "imchatty",
    capability: BOT_CAPABILITIES.HANDOFF_TO_PERSONA,
    actorUserId: user.id,
    targetUserId: user.id,
    payload: {
      toPersona: persona.persona_key,
      reason: body?.reason || "post_onboarding_mood_capture",
      onboardingJustCompleted: true,
      displayname: body?.displayname || null,
      bio: body?.bio || null,
      locale: body?.locale || null,
      nudges: body?.nudges || {},
    },
  });

  // --- Snapshot live_mood_states → match_intakes + create match_request ---
  try {
    const supabase = await getServiceRoleClient(event);

    const { data: liveState } = await supabase
      .from("live_mood_states")
      .select("emotion, intent, energy, privacy, time_horizon, free_text_raw, free_text_refined, source_persona, confidence")
      .eq("user_id", user.id)
      .maybeSingle();

    if (liveState) {
      const topicHint = inferTopicHint(liveState.free_text_raw);

      const { data: intake, error: intakeError } = await supabase
        .from("match_intakes")
        .insert({
          user_id:          user.id,
          emotion:          liveState.emotion,
          intent:           liveState.intent,
          energy:           liveState.energy,
          privacy:          liveState.privacy,
          time_horizon:     liveState.time_horizon,
          free_text_raw:    liveState.free_text_raw,
          free_text_refined: liveState.free_text_refined,
          confidence:       liveState.confidence,
          topic_hint:       topicHint,
          source_persona:   liveState.source_persona,
          locale:           body?.locale || null,
        })
        .select("id")
        .maybeSingle();

      if (intakeError) {
        console.warn("[handoff] match_intake insert failed:", intakeError.message);
      } else if (intake?.id) {
        // Cancel any existing pending request before creating a new one
        await supabase
          .from("match_requests")
          .update({ status: "cancelled" })
          .eq("user_id", user.id)
          .eq("status", "pending");

        const { error: requestError } = await supabase
          .from("match_requests")
          .insert({
            user_id:           user.id,
            intake_id:         intake.id,
            status:            "pending",
            allow_ai_fallback: true,
          });

        if (requestError) {
          console.warn("[handoff] match_request insert failed:", requestError.message);
        }
      }
    } else {
      console.debug(`[handoff] no live_mood_states row for user ${user.id} — skipping match_intake snapshot.`);
    }
  } catch (snapshotErr) {
    // Non-fatal — handoff already succeeded, don't surface this to the client
    console.warn("[handoff] match snapshot error:", (snapshotErr as Error)?.message || snapshotErr);
  }

  return {
    ok: true,
    handoff: result,
  };
});
