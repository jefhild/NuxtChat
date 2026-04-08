/**
 * agent:reactive — runs every 60 seconds
 *
 * Finds unanswered messages in active agent conversations and generates replies.
 * Only runs for profiles where agent_enabled = true.
 */
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  generateAgentReply,
  sendAgentMessage,
  incrementExchangeCount,
} from "~/server/utils/agentEngine";

const REPLY_WINDOW_SECONDS = 300; // look back 5 minutes for unanswered messages

export default {
  async run({ payload: _payload, context }: { payload: unknown; context: Record<string, unknown> }) {
    const event = context?.event;
    const supabase = await getServiceRoleClient(event);
    const runtimeConfig = useRuntimeConfig(event);

    // 1. Find active agent conversations with an unanswered incoming message
    const since = new Date(Date.now() - REPLY_WINDOW_SECONDS * 1000).toISOString();

    const { data: activeLogs } = await supabase
      .from("agent_conversation_log")
      .select(`
        id,
        agent_profile_id,
        target_user_id,
        exchange_count,
        status,
        agent_profile:profiles!agent_conversation_log_agent_profile_id_fkey (
          id, user_id, displayname, bio, age, gender_id, preferred_locale, agent_enabled
        ),
        target_profile:profiles!agent_conversation_log_target_user_id_fkey (
          preferred_locale
        )
      `)
      .eq("status", "active");

    if (!activeLogs?.length) return { result: "no active conversations" };

    let repliesSent = 0;

    for (const log of activeLogs) {
      const agentProfile = Array.isArray(log.agent_profile) ? log.agent_profile[0] : log.agent_profile;
      const targetProfile = Array.isArray(log.target_profile) ? log.target_profile[0] : log.target_profile;

      if (!agentProfile?.agent_enabled) continue;

      // agent_configs has no direct FK to agent_conversation_log, so query separately
      const { data: configRow } = await supabase
        .from("agent_configs")
        .select("prompt_preset_key, system_prompt_addition, max_exchanges_per_conversation, max_conversations_per_session")
        .eq("profile_id", log.agent_profile_id)
        .eq("enabled", true)
        .maybeSingle();

      if (!configRow) continue;
      const config = configRow;

      // Check per-session conversation limit
      const { count: sessionCount } = await supabase
        .from("agent_conversation_log")
        .select("id", { count: "exact", head: true })
        .eq("agent_profile_id", log.agent_profile_id)
        .eq("status", "active");

      if ((sessionCount ?? 0) > (config.max_conversations_per_session ?? 10)) continue;

      // Skip if this conversation has already hit its exchange limit
      if ((log.exchange_count ?? 0) >= (config.max_exchanges_per_conversation ?? 5)) continue;

      // Find the most recent unanswered message from the target
      const { data: incoming } = await supabase
        .from("messages")
        .select("id, content, created_at")
        .eq("sender_id", log.target_user_id)
        .eq("receiver_id", agentProfile.user_id)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!incoming) continue;

      // Check no agent reply already sent after this message
      const { data: alreadyReplied } = await supabase
        .from("messages")
        .select("id")
        .eq("sender_id", agentProfile.user_id)
        .eq("receiver_id", log.target_user_id)
        .eq("sent_by_agent", true)
        .gte("created_at", incoming.created_at)
        .limit(1)
        .maybeSingle();

      if (alreadyReplied) continue;

      // Fetch short conversation history (last 10 messages)
      const { data: history } = await supabase
        .from("messages")
        .select("sender_id, content")
        .or(
          `and(sender_id.eq.${agentProfile.user_id},receiver_id.eq.${log.target_user_id}),` +
          `and(sender_id.eq.${log.target_user_id},receiver_id.eq.${agentProfile.user_id})`
        )
        .order("created_at", { ascending: false })
        .limit(10);

      const conversationHistory = (history ?? [])
        .reverse()
        .map((m) => ({
          role: m.sender_id === agentProfile.user_id ? ("assistant" as const) : ("user" as const),
          content: m.content,
        }));

      // Generate and send reply
      const reply = await generateAgentReply(
        agentProfile,
        config,
        conversationHistory,
        incoming.content,
        runtimeConfig
      );

      if (!reply) continue;

      const sent = await sendAgentMessage(
        supabase,
        agentProfile.user_id,
        log.target_user_id,
        reply,
        {
          senderLocale: agentProfile.preferred_locale,
          targetLocale: targetProfile?.preferred_locale,
          runtimeConfig,
        }
      );

      if (sent) {
        repliesSent++;
        await incrementExchangeCount(supabase, log.id, config.max_exchanges_per_conversation ?? 5);
      }
    }

    return { result: `replied to ${repliesSent} conversation(s)` };
  },
};
