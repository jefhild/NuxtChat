/**
 * Away Agent Engine
 *
 * Handles prompt building, message sending, and conversation tracking
 * for user-activated away agents.
 */

import { getOpenAIClient } from "~/server/utils/openaiGateway";
import { translateText, normalizeLocale } from "~/server/utils/translate";

const LOCALE_NAME: Record<string, string> = {
  en: "English",
  fr: "French",
  ru: "Russian",
  zh: "Chinese",
};

export type AgentPromptPreset =
  | "friendly"
  | "curious"
  | "playful"
  | "professional"
  | "custom";

export interface AgentConfig {
  profile_id: string;
  enabled: boolean;
  prompt_preset_key: AgentPromptPreset;
  system_prompt_addition: string | null;
  greeting_template: string | null;
  max_exchanges_per_conversation: number;
  max_conversations_per_session: number;
  target_gender_ids: number[] | null;
  target_mood_keys: string[] | null;
}

export interface AgentProfile {
  id: string;
  user_id: string;
  displayname: string;
  bio: string | null;
  age: number | null;
  gender_id: number | null;
  preferred_locale: string;
  agent_enabled: boolean;
}

export interface ConversationLog {
  id: string;
  agent_profile_id: string;
  target_user_id: string;
  room_id: string | null;
  exchange_count: number;
  status: string;
}

// Preset prompt additions injected into the system prompt
const PRESET_PROMPT_MAP: Record<AgentPromptPreset, string> = {
  friendly:
    "Be warm, welcoming, and genuine. Focus on making the other person feel comfortable and valued. Ask about them before sharing about yourself.",
  curious:
    "Show genuine curiosity. Ask thoughtful questions and explore topics the other person brings up. Make them feel truly heard and interesting.",
  playful:
    "Keep the tone light and fun. Use gentle humour where appropriate, be a little witty, but stay kind and avoid anything that could feel pushy.",
  professional:
    "Be direct, respectful, and topic-focused. Skip small talk and get to interesting conversation quickly. Keep messages concise.",
  custom: "",
};

/**
 * Build the OpenAI system prompt for the away agent.
 */
export function buildAgentSystemPrompt(
  agentProfile: AgentProfile,
  config: AgentConfig
): string {
  const presetText =
    config.prompt_preset_key === "custom"
      ? ""
      : PRESET_PROMPT_MAP[config.prompt_preset_key] || "";

  const customText = (config.system_prompt_addition || "").trim();
  const bio = (agentProfile.bio || "").trim();
  const name = agentProfile.displayname || "User";

  const parts = [
    `You are an away agent acting on behalf of ${name}, a real user who is currently offline.`,
    `Your job is to start and continue conversations as if you are ${name}, using their personality and interests.`,
    bio ? `About ${name}: ${bio}` : "",
    `Style guidance: ${presetText}`,
    customText ? `Additional instructions from ${name}: ${customText}` : "",
    `Important rules:`,
    `- Never pretend to be human when directly asked if you are a bot or AI.`,
    `- Keep messages conversational and natural — 1-3 short sentences per reply.`,
    `- Do not discuss sensitive topics, politics, or anything that could be harmful.`,
    `- You are representing ${name}'s profile; stay consistent with their bio and interests.`,
    `- When the conversation hits its limit, end gracefully: "I'll let ${name} continue this when they're back online."`,
    agentProfile.preferred_locale
      ? `- Always reply in ${LOCALE_NAME[normalizeLocale(agentProfile.preferred_locale) ?? "en"] ?? "English"} — translation to the recipient's language is handled automatically.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return parts;
}

/**
 * Generate an agent reply to an incoming message using OpenAI.
 */
export async function generateAgentReply(
  agentProfile: AgentProfile,
  config: AgentConfig,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  incomingMessage: string,
  runtimeConfig: any
): Promise<string | null> {
  const { client, model } = getOpenAIClient({ runtimeConfig });
  if (!client) return null;

  const systemPrompt = buildAgentSystemPrompt(agentProfile, config);
  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...conversationHistory,
    { role: "user" as const, content: incomingMessage },
  ];

  const response = await client.chat.completions.create({
    model,
    messages,
    max_tokens: 150,
    temperature: 0.8,
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

/**
 * Generate a proactive greeting for a new target user.
 */
export async function generateAgentGreeting(
  agentProfile: AgentProfile,
  config: AgentConfig,
  targetProfile: { displayname: string; bio: string | null },
  runtimeConfig: any
): Promise<string | null> {
  // Use the greeting template if set, otherwise generate one
  if (config.greeting_template?.trim()) {
    return config.greeting_template.trim();
  }

  const { client, model } = getOpenAIClient({ runtimeConfig });
  if (!client) return null;

  const systemPrompt = buildAgentSystemPrompt(agentProfile, config);
  const targetBio = targetProfile.bio
    ? ` Their profile says: "${targetProfile.bio}"`
    : "";

  const prompt = `Write a natural, short opening message to ${targetProfile.displayname}.${targetBio} Keep it to 1-2 sentences. Don't use their name in the opener — just start the conversation naturally.`;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system" as const, content: systemPrompt },
      { role: "user" as const, content: prompt },
    ],
    max_tokens: 80,
    temperature: 0.9,
  });

  return response.choices[0]?.message?.content?.trim() ?? null;
}

/**
 * Insert a message into the messages table as the agent (service role).
 * If senderLocale and targetLocale differ, the content is translated first.
 */
export async function sendAgentMessage(
  supabase: any,
  senderUserId: string,
  receiverUserId: string,
  content: string,
  opts?: {
    senderLocale?: string | null;
    targetLocale?: string | null;
    runtimeConfig?: any;
  }
): Promise<{ id: string } | null> {
  const senderLocale = normalizeLocale(opts?.senderLocale);
  const targetLocale = normalizeLocale(opts?.targetLocale);

  const translationFields: Record<string, string> = {};

  if (senderLocale && targetLocale && senderLocale !== targetLocale && opts?.runtimeConfig) {
    try {
      const result = await translateText({
        text: content,
        targetLocale,
        sourceLocaleHint: senderLocale,
        config: opts.runtimeConfig,
      });
      if (result.ok && result.translatedText && result.translatedText !== content) {
        translationFields.original_language = result.sourceLocale;
        translationFields.translated_content = result.translatedText;
        translationFields.translated_language = targetLocale;
        translationFields.translation_engine = result.engine;
        translationFields.translation_created_at = new Date().toISOString();
      }
    } catch (err) {
      console.error("[agentEngine] translation failed, sending untranslated:", err);
    }
  }

  const { data, error } = await supabase
    .from("messages")
    .insert({
      sender_id: senderUserId,
      receiver_id: receiverUserId,
      content,
      sent_by_agent: true,
      ...translationFields,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[agentEngine] sendAgentMessage error:", error.message);
    return null;
  }
  return data;
}

/**
 * Get or create a conversation log entry for an agent↔target pair.
 */
export async function getOrCreateConversationLog(
  supabase: any,
  agentProfileId: string,
  targetUserId: string
): Promise<ConversationLog | null> {
  const { data: existing } = await supabase
    .from("agent_conversation_log")
    .select("*")
    .eq("agent_profile_id", agentProfileId)
    .eq("target_user_id", targetUserId)
    .eq("status", "active")
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("agent_conversation_log")
    .insert({
      agent_profile_id: agentProfileId,
      target_user_id: targetUserId,
      exchange_count: 0,
      status: "active",
    })
    .select("*")
    .maybeSingle();

  if (error) {
    console.error("[agentEngine] getOrCreateConversationLog error:", error.message);
    return null;
  }
  return created;
}

/**
 * Increment exchange count and mark as limit_reached when cap is hit.
 * Returns false if the limit is now reached (no more replies should be sent).
 */
export async function incrementExchangeCount(
  supabase: any,
  logId: string,
  maxExchanges: number
): Promise<boolean> {
  const { data: current } = await supabase
    .from("agent_conversation_log")
    .select("exchange_count")
    .eq("id", logId)
    .maybeSingle();

  const newCount = (current?.exchange_count ?? 0) + 1;
  const limitReached = newCount >= maxExchanges;

  await supabase
    .from("agent_conversation_log")
    .update({
      exchange_count: newCount,
      ...(limitReached
        ? { status: "limit_reached", ended_at: new Date().toISOString() }
        : {}),
    })
    .eq("id", logId);

  return !limitReached;
}

/**
 * Mark all active conversations for an agent as handed off (owner returned).
 */
export async function handOffAgentConversations(
  supabase: any,
  agentProfileId: string
): Promise<void> {
  await supabase
    .from("agent_conversation_log")
    .update({ status: "owner_returned", ended_at: new Date().toISOString() })
    .eq("agent_profile_id", agentProfileId)
    .eq("status", "active");
}

/**
 * Deactivate an agent: set agent_enabled = false on profile + agent_configs,
 * and hand off all active conversations.
 */
export async function deactivateAgent(
  supabase: any,
  profileId: string
): Promise<void> {
  await Promise.all([
    supabase
      .from("profiles")
      .update({ agent_enabled: false })
      .eq("id", profileId),
    supabase
      .from("agent_configs")
      .update({ enabled: false })
      .eq("profile_id", profileId),
    handOffAgentConversations(supabase, profileId),
  ]);
}
