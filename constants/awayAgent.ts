export const AWAY_AGENT_MAX_SIMULTANEOUS_CONVERSATIONS = 5;

export const AWAY_AGENT_SIMULTANEOUS_CONVERSATION_OPTIONS = [1, 3, 5];

export const clampAwayAgentConversationLimit = (value: unknown) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return AWAY_AGENT_MAX_SIMULTANEOUS_CONVERSATIONS;
  return Math.min(Math.max(parsed, 1), AWAY_AGENT_MAX_SIMULTANEOUS_CONVERSATIONS);
};
