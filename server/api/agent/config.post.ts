/**
 * POST /api/agent/config
 * Save or update the away agent configuration for the authenticated user.
 */
import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { clampAwayAgentConversationLimit } from "~/constants/awayAgent";

const VALID_PRESETS = ["friendly", "curious", "playful", "professional", "custom"];

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);

  const presetKey = body?.prompt_preset_key ?? "friendly";
  if (!VALID_PRESETS.includes(presetKey)) {
    setResponseStatus(event, 400);
    return { error: "Invalid prompt_preset_key" };
  }

  const maxExchanges = Math.min(Math.max(parseInt(body?.max_exchanges_per_conversation) || 5, 1), 20);
  const maxConvs = clampAwayAgentConversationLimit(body?.max_conversations_per_session);

  const supabase = await getServiceRoleClient(event);

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    setResponseStatus(event, 404);
    return { error: "Profile not found" };
  }

  const configPayload = {
    profile_id: profile.id,
    prompt_preset_key: presetKey,
    system_prompt_addition: body?.system_prompt_addition?.trim() ?? null,
    greeting_template: body?.greeting_template?.trim() ?? null,
    max_exchanges_per_conversation: maxExchanges,
    max_conversations_per_session: maxConvs,
    target_gender_ids: body?.target_gender_ids ?? null,
    target_mood_keys: body?.target_mood_keys ?? null,
  };

  const { data, error } = await supabase
    .from("agent_configs")
    .upsert(configPayload, { onConflict: "profile_id" })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[agent/config] upsert error:", error.message);
    setResponseStatus(event, 500);
    return { error: "Failed to save config" };
  }

  return { success: true, config: data };
});
