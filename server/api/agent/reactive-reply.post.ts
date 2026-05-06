import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  claimAgentReplyLock,
  clearAgentReplyLock,
  generateAgentReply,
  getOrCreateConversationLog,
  incrementExchangeCount,
  loadLanguagePracticeAgentContext,
  sendAgentMessage,
} from "~/server/utils/agentEngine";
import { isAgentOwnerAvailable } from "~/server/utils/agentAvailability";
import { clampAwayAgentConversationLimit } from "~/constants/awayAgent";

const REPLY_WINDOW_SECONDS = 5 * 60;

const normalizeUserId = (value: unknown) => {
  const id = String(value || "").trim();
  return id || null;
};

const logReactiveReply = (
  stage: string,
  details: Record<string, unknown> = {}
) => {
  console.info("[agent/reactive-reply]", stage, details);
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const agentUserId = normalizeUserId(body?.agentUserId ?? body?.agent_user_id);
  if (!agentUserId || agentUserId === user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "agentUserId is required",
    });
  }

  logReactiveReply("received", {
    senderUserId: user.id,
    agentUserId,
  });

  const supabase = await getServiceRoleClient(event);
  const runtimeConfig = useRuntimeConfig(event);
  const ownerAvailable = await isAgentOwnerAvailable(supabase, agentUserId);
  logReactiveReply("availability_checked", {
    senderUserId: user.id,
    agentUserId,
    ownerAvailable,
  });
  if (ownerAvailable) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      reason: "agent_owner_online",
    });
    return { ok: true, skipped: "agent_owner_online" };
  }

  const { data: agentProfile, error: agentProfileError } = await supabase
    .from("profiles")
    .select("id, user_id, displayname, bio, age, gender_id, preferred_locale, agent_enabled")
    .eq("user_id", agentUserId)
    .eq("agent_enabled", true)
    .maybeSingle();

  if (agentProfileError) {
    throw createError({ statusCode: 500, statusMessage: agentProfileError.message });
  }
  if (!agentProfile?.id) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      reason: "agent_disabled",
    });
    return { ok: true, skipped: "agent_disabled" };
  }

  const [{ data: config }, { data: targetProfile }] = await Promise.all([
    supabase
      .from("agent_configs")
      .select(
        "profile_id, enabled, prompt_preset_key, system_prompt_addition, greeting_template, first_auto_reply_template, max_exchanges_per_conversation, max_conversations_per_session, target_gender_ids, target_mood_keys"
      )
      .eq("profile_id", agentProfile.id)
      .eq("enabled", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("preferred_locale")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!config) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      reason: "agent_config_disabled",
    });
    return { ok: true, skipped: "agent_config_disabled" };
  }

  logReactiveReply("config_loaded", {
    senderUserId: user.id,
    agentUserId,
    agentProfileId: agentProfile.id,
    firstAutoReplyConfigured: Boolean(
      config.first_auto_reply_template?.trim()
    ),
    maxExchangesPerConversation: config.max_exchanges_per_conversation ?? 5,
    maxConversationsPerSession:
      clampAwayAgentConversationLimit(config.max_conversations_per_session),
    targetLocale: targetProfile?.preferred_locale ?? null,
  });

  const log = await getOrCreateConversationLog(supabase, agentProfile.id, user.id);
  if (!log) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      reason: "conversation_log_unavailable",
    });
    return { ok: false, skipped: "conversation_log_unavailable" };
  }

  if (
    (log.exchange_count ?? 0) >=
    (config.max_exchanges_per_conversation ?? 5)
  ) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      exchangeCount: log.exchange_count ?? 0,
      reason: "conversation_limit_reached",
    });
    return { ok: true, skipped: "conversation_limit_reached" };
  }

  const { count: sessionCount } = await supabase
    .from("agent_conversation_log")
    .select("id", { count: "exact", head: true })
    .eq("agent_profile_id", agentProfile.id)
    .eq("status", "active");

  if (
    (sessionCount ?? 0) >=
    clampAwayAgentConversationLimit(config.max_conversations_per_session)
  ) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      sessionCount: sessionCount ?? 0,
      reason: "session_limit_reached",
    });
    return { ok: true, skipped: "session_limit_reached" };
  }

  const since = new Date(Date.now() - REPLY_WINDOW_SECONDS * 1000).toISOString();
  const { data: incoming } = await supabase
    .from("messages")
    .select("id, content, created_at")
    .eq("sender_id", user.id)
    .eq("receiver_id", agentProfile.user_id)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!incoming) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      reason: "no_recent_message",
      since,
    });
    return { ok: true, skipped: "no_recent_message" };
  }
  logReactiveReply("incoming_message_found", {
    senderUserId: user.id,
    agentUserId,
    agentProfileId: agentProfile.id,
    conversationLogId: log.id,
    incomingMessageId: incoming.id,
    incomingCreatedAt: incoming.created_at,
  });
  if (log.last_replied_message_id && log.last_replied_message_id === incoming.id) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      incomingMessageId: incoming.id,
      lastRepliedMessageId: log.last_replied_message_id,
      reason: "already_replied_to_message",
    });
    return { ok: true, skipped: "already_replied_to_message" };
  }

  const { data: alreadyReplied } = await supabase
    .from("messages")
    .select("id")
    .eq("sender_id", agentProfile.user_id)
    .eq("receiver_id", user.id)
    .eq("sent_by_agent", true)
    .gte("created_at", incoming.created_at)
    .limit(1)
    .maybeSingle();

  if (alreadyReplied) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      incomingMessageId: incoming.id,
      existingReplyId: alreadyReplied.id,
      reason: "already_replied",
    });
    return { ok: true, skipped: "already_replied" };
  }

  const claimed = await claimAgentReplyLock(supabase, log.id);
  if (!claimed) {
    logReactiveReply("skipped", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      reason: "reply_in_progress",
    });
    return { ok: true, skipped: "reply_in_progress" };
  }

  try {
    const { data: history } = await supabase
      .from("messages")
      .select("sender_id, content")
      .or(
        `and(sender_id.eq.${agentProfile.user_id},receiver_id.eq.${user.id}),` +
          `and(sender_id.eq.${user.id},receiver_id.eq.${agentProfile.user_id})`
      )
      .order("created_at", { ascending: false })
      .limit(10);

    const conversationHistory = (history ?? [])
      .reverse()
      .map((m: any) => ({
        role:
          m.sender_id === agentProfile.user_id
            ? ("assistant" as const)
            : ("user" as const),
        content: m.content,
      }));

    const languagePracticeContext = await loadLanguagePracticeAgentContext(
      supabase,
      user.id,
      agentProfile.user_id
    );

    const reply = await generateAgentReply(
      agentProfile,
      config,
      conversationHistory,
      incoming.content,
      runtimeConfig,
      languagePracticeContext,
      targetProfile?.preferred_locale ?? null
    );

    if (!reply) {
      await clearAgentReplyLock(supabase, log.id);
      logReactiveReply("skipped", {
        senderUserId: user.id,
        agentUserId,
        agentProfileId: agentProfile.id,
        conversationLogId: log.id,
        incomingMessageId: incoming.id,
        reason: "no_reply_generated",
      });
      return { ok: true, skipped: "no_reply_generated" };
    }

    logReactiveReply("reply_generated", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      incomingMessageId: incoming.id,
      usedFirstAutoReplyTemplate:
        Boolean(config.first_auto_reply_template?.trim()) &&
        !conversationHistory.some(
          (message) => message.role === "assistant" && message.content?.trim()
        ),
      replyPreview: reply.slice(0, 120),
    });

    const sent = await sendAgentMessage(
      supabase,
      agentProfile.user_id,
      user.id,
      reply,
      {
        senderLocale: agentProfile.preferred_locale,
        targetLocale: targetProfile?.preferred_locale,
        runtimeConfig,
      }
    );

    if (!sent) {
      await clearAgentReplyLock(supabase, log.id);
      logReactiveReply("skipped", {
        senderUserId: user.id,
        agentUserId,
        agentProfileId: agentProfile.id,
        conversationLogId: log.id,
        incomingMessageId: incoming.id,
        reason: "send_failed",
      });
      return { ok: false, skipped: "send_failed" };
    }

    await incrementExchangeCount(
      supabase,
      log.id,
      config.max_exchanges_per_conversation ?? 5,
      incoming.id
    );

    logReactiveReply("sent", {
      senderUserId: user.id,
      agentUserId,
      agentProfileId: agentProfile.id,
      conversationLogId: log.id,
      incomingMessageId: incoming.id,
    });

    return { ok: true, sent: true };
  } catch (error) {
    await clearAgentReplyLock(supabase, log.id);
    console.error("[agent/reactive-reply] failed", {
      senderUserId: user.id,
      agentUserId,
      error,
    });
    throw error;
  }
});
