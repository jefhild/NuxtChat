/**
 * POST /api/agent/activate
 * Toggle the away agent on or off for the authenticated user.
 * On deactivation, hands off all active conversations.
 */
import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { deactivateAgent } from "~/server/utils/agentEngine";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);
  const enabled = Boolean(body?.enabled);

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

  if (!enabled) {
    // Full deactivation: disable flag, close conversations, sync config
    await deactivateAgent(supabase, profile.id);
    return { success: true, enabled: false };
  }

  // Ensure a config row exists before activating
  const { data: existingConfig } = await supabase
    .from("agent_configs")
    .select("id")
    .eq("profile_id", profile.id)
    .maybeSingle();

  if (!existingConfig) {
    // Create a default config
    await supabase.from("agent_configs").insert({
      profile_id: profile.id,
      enabled: true,
    });
  } else {
    await supabase
      .from("agent_configs")
      .update({ enabled: true })
      .eq("profile_id", profile.id);
  }

  // Set agent_enabled on profile
  const { error } = await supabase
    .from("profiles")
    .update({ agent_enabled: true })
    .eq("id", profile.id);

  if (error) {
    console.error("[agent/activate] update error:", error.message);
    setResponseStatus(event, 500);
    return { error: "Failed to activate agent" };
  }

  return { success: true, enabled: true };
});
