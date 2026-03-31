/**
 * /api/live-mood/self-select
 *
 * Lightweight endpoint that lets an authenticated user self-select a mood
 * from a preset (or explicit signals) without going through the full bot
 * conversation.  Writes directly to:
 *   - live_mood_states   (upsert, expires in 4 hours — slightly longer than
 *                         bot-inferred because it's an intentional choice)
 *   - match_intakes      (insert snapshot — persists beyond the TTL)
 *
 * Body:
 *   emotion      string  (required)
 *   intent       string  (required)
 *   energy       string  (required)
 *   time_horizon string  (optional, defaults to "right_now")
 *   topic_hint   string  (optional)
 *   free_text    string  (optional — the mood feed post text that was inferred)
 */
import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import { LIVE_MOOD_TAXONOMY, inferTopicHint } from "@/server/utils/botPlatform";

const VALID_EMOTIONS = LIVE_MOOD_TAXONOMY.emotions as readonly string[];
const VALID_INTENTS = LIVE_MOOD_TAXONOMY.intents as readonly string[];
const VALID_ENERGY = LIVE_MOOD_TAXONOMY.energy as readonly string[];

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const body = await readBody(event);

  const emotion = String(body?.emotion || "").trim();
  const intent = String(body?.intent || "").trim();
  const energy = String(body?.energy || "").trim();
  const time_horizon = String(body?.time_horizon || "right_now").trim();
  const topic_hint = body?.topic_hint ? String(body.topic_hint).trim() : null;
  const free_text = body?.free_text ? String(body.free_text).trim() : null;

  if (!VALID_EMOTIONS.includes(emotion)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid emotion: ${emotion}` });
  }
  if (!VALID_INTENTS.includes(intent)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid intent: ${intent}` });
  }
  if (!VALID_ENERGY.includes(energy)) {
    throw createError({ statusCode: 400, statusMessage: `Invalid energy: ${energy}` });
  }

  const supabase = await getServiceRoleClient(event);
  const expiresAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  const resolvedTopicHint = topic_hint || (free_text ? inferTopicHint(free_text) : null);

  // 1. Upsert live_mood_states (ephemeral — used by candidates.get.ts scoring)
  const { error: stateErr } = await supabase
    .from("live_mood_states")
    .upsert(
      {
        user_id: user.id,
        emotion,
        intent,
        energy,
        privacy: "private_matching_only",
        time_horizon,
        free_text_raw: free_text,
        free_text_refined: free_text,
        source_type: "self_selected",
        confidence: 0.85,
        captured_at: new Date().toISOString(),
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (stateErr) {
    throw createError({ statusCode: 500, statusMessage: stateErr.message });
  }

  // 2. Insert match_intake snapshot (persistent — used for scoring later)
  const { data: intake, error: intakeErr } = await supabase
    .from("match_intakes")
    .insert({
      user_id: user.id,
      emotion,
      intent,
      energy,
      privacy: "private_matching_only",
      time_horizon,
      free_text_raw: free_text,
      free_text_refined: free_text,
      confidence: 0.85,
      topic_hint: resolvedTopicHint,
      source_persona: "self_selected",
    })
    .select("id")
    .maybeSingle();

  if (intakeErr) {
    throw createError({ statusCode: 500, statusMessage: intakeErr.message });
  }

  // 3. Cancel any stale pending match_request and queue a fresh one
  if (intake?.id) {
    await supabase
      .from("match_requests")
      .update({ status: "cancelled" })
      .eq("user_id", user.id)
      .eq("status", "pending");

    await supabase.from("match_requests").insert({
      user_id: user.id,
      intake_id: intake.id,
      status: "pending",
      allow_ai_fallback: true,
    });
  }

  return { ok: true, intake_id: intake?.id ?? null };
});
