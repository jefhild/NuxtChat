/**
 * agent:proactive — runs every 2 minutes (fallback)
 *
 * Safety net for users whose presence-join event was missed by the
 * agentPresenceWatcher plugin (e.g. server restart mid-session).
 * The plugin handles immediate greetings; this task only contacts users
 * who came online in the last 5 minutes and haven't been reached yet.
 */
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  generateAgentGreeting,
  sendAgentMessage,
  getOrCreateConversationLog,
  CONTACT_COOLDOWN_HOURS,
  MAX_AGENTS_PER_TARGET_PER_DAY,
} from "~/server/utils/agentEngine";
import { snapshotPresenceUserIds } from "~/server/utils/presenceSnapshot";
import { clampAwayAgentConversationLimit } from "~/constants/awayAgent";

/**
 * Fallback window: slightly wider than the cron interval (every 2 min) so we
 * catch users whose presence-join event was missed (server restart, etc.).
 * The presence watcher plugin handles immediate greetings; this task is a net.
 */
const ONLINE_WINDOW_MINUTES = 5;

export default {
  async run({ payload: _payload, context }: { payload: unknown; context: Record<string, unknown> }) {
    const event = context?.event;
    const supabase = await getServiceRoleClient(event);
    const runtimeConfig = useRuntimeConfig(event);

    const onlineSince = new Date(Date.now() - ONLINE_WINDOW_MINUTES * 60 * 1000).toISOString();
    const cooldownSince = new Date(Date.now() - CONTACT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();

    // Snapshot the live presence channel so we can skip users who are no
    // longer connected. Keys in presenceState() are the userId strings set
    // by presenceStore2.js (String(userId)).
    const onlineUserIds = await snapshotPresenceUserIds(supabase);

    // 1. Get all active agents with their configs and profiles
    const { data: activeAgents } = await supabase
      .from("agent_configs")
      .select(`
        profile_id,
        prompt_preset_key,
        system_prompt_addition,
        greeting_template,
        max_exchanges_per_conversation,
        max_conversations_per_session,
        target_gender_ids,
        target_mood_keys,
        profile:profiles!agent_configs_profile_id_fkey (
          id, user_id, displayname, bio, age, gender_id, preferred_locale, agent_enabled
        )
      `)
      .eq("enabled", true);

    if (!activeAgents?.length) return { result: "no active agents" };

    let contactsMade = 0;

    for (const agent of activeAgents) {
      const agentProfile = Array.isArray(agent.profile) ? agent.profile[0] : agent.profile;
      if (!agentProfile?.agent_enabled) continue;
      if (onlineUserIds.has(agentProfile.user_id)) continue;

      // Check current active conversation count vs session limit
      const { count: activeCount } = await supabase
        .from("agent_conversation_log")
        .select("id", { count: "exact", head: true })
        .eq("agent_profile_id", agentProfile.id)
        .eq("status", "active");

      if ((activeCount ?? 0) >= clampAwayAgentConversationLimit(agent.max_conversations_per_session)) continue;

      // 2. Find recently online users not yet contacted by this agent
      let query = supabase
        .from("profiles")
        .select("id, user_id, displayname, bio, gender_id, preferred_locale")
        .eq("is_private", false)
        .eq("is_ai", false)
        .eq("agent_enabled", false) // don't contact other agents
        .neq("user_id", agentProfile.user_id)
        .gte("last_active", onlineSince)
        .limit(20);

      // Apply gender filter if set
      if (agent.target_gender_ids?.length) {
        query = query.in("gender_id", agent.target_gender_ids);
      }

      const { data: candidates } = await query;
      if (!candidates?.length) continue;

      // 3. Filter out users already contacted within the cooldown window
      const { data: recentContacts } = await supabase
        .from("agent_conversation_log")
        .select("target_user_id")
        .eq("agent_profile_id", agentProfile.id)
        .gte("started_at", cooldownSince);

      const alreadyContactedIds = new Set(
        (recentContacts ?? []).map((r) => r.target_user_id)
      );

      // 4. Check how many distinct agents have already contacted each candidate today
      const candidateUserIds = candidates.map((c) => c.user_id);
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: dailyContacts } = await supabase
        .from("agent_conversation_log")
        .select("target_user_id, agent_profile_id")
        .in("target_user_id", candidateUserIds)
        .gte("started_at", dayAgo);

      // Build map: target_user_id → count of distinct agents
      const agentsPerTarget = new Map<string, Set<string>>();
      for (const row of (dailyContacts ?? [])) {
        if (!agentsPerTarget.has(row.target_user_id)) {
          agentsPerTarget.set(row.target_user_id, new Set());
        }
        agentsPerTarget.get(row.target_user_id)!.add(row.agent_profile_id);
      }

      const freshCandidates = candidates.filter((c) => {
        if (alreadyContactedIds.has(c.user_id)) return false;
        const agentCount = agentsPerTarget.get(c.user_id)?.size ?? 0;
        if (agentCount >= MAX_AGENTS_PER_TARGET_PER_DAY) return false;
        // Only target users who are currently in the presence channel.
        // If onlineUserIds is empty (presence unavailable) we fall back to
        // the last_active window from the DB query above.
        if (onlineUserIds.size > 0 && !onlineUserIds.has(c.user_id)) return false;
        return true;
      });
      if (!freshCandidates.length) continue;

      // Pick a random candidate so different users get contacted across runs
      const target = freshCandidates[Math.floor(Math.random() * freshCandidates.length)];

      // 5. Generate greeting and send
      const greeting = await generateAgentGreeting(
        agentProfile,
        agent,
        { displayname: target.displayname, bio: target.bio },
        runtimeConfig
      );
      if (!greeting) continue;

      const sent = await sendAgentMessage(
        supabase,
        agentProfile.user_id,
        target.user_id,
        greeting,
        {
          senderLocale: agentProfile.preferred_locale,
          targetLocale: target.preferred_locale,
          runtimeConfig,
        }
      );

      if (sent) {
        contactsMade++;
        await getOrCreateConversationLog(supabase, agentProfile.id, target.user_id);
      }

      // Respect session limit — stop if we hit the cap
      const newActiveCount = (activeCount ?? 0) + contactsMade;
      if (newActiveCount >= clampAwayAgentConversationLimit(agent.max_conversations_per_session)) break;
    }

    return { result: `initiated ${contactsMade} new conversation(s)` };
  },
};

/**
 * Subscribe to presence:global briefly, wait for the initial sync, then
 * return the set of currently-online user IDs (the presence key = userId).
 * Falls back to an empty set if the channel doesn't sync within 5 seconds.
 */
