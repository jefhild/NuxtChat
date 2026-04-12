/**
 * GET /api/agent/status
 * Returns the current agent config + active conversation count for the authenticated user.
 */
import { defineEventHandler, setResponseStatus } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { snapshotPresenceUserIds } from "~/server/utils/presenceSnapshot";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const supabase = await getServiceRoleClient(event);
  const onlineUserIds = await snapshotPresenceUserIds(supabase);

  // Get the user's profile id
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, agent_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!profile) {
    setResponseStatus(event, 404);
    return { error: "Profile not found" };
  }

  // Get agent config
  const { data: config } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("profile_id", profile.id)
    .maybeSingle();

  // Count active conversations
  const { count: activeConversations } = await supabase
    .from("agent_conversation_log")
    .select("id", { count: "exact", head: true })
    .eq("agent_profile_id", profile.id)
    .eq("status", "active");

  return {
    enabled: config?.enabled ?? profile.agent_enabled ?? false,
    config: config ?? null,
    activeConversations: activeConversations ?? 0,
    pausedBecauseOnline: onlineUserIds.has(user.id),
  };
});
