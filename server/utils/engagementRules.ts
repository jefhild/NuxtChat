const ALLOWED_CONTEXTS = ["discussion", "chat"] as const;

const clampNumber = (value: any, min: number, max: number, fallback: number) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(Math.max(num, min), max);
};

const toBoolean = (value: any, fallback: boolean) =>
  typeof value === "boolean" ? value : fallback;

const parseJson = (value: any, fallback: Record<string, any>) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "object") return value as Record<string, any>;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return fallback;
};

const BASE_RULES = {
  max_replies_per_persona: 3,
  min_delay_ms: 2000,
  human_activity_required: true,
  allow_persona_to_persona: true,
  persona_to_persona_requires_human: true,
  persona_to_persona_probability: 0.35,
  reply_length: "short",
  audience_mode: "discussion",
  include_user_age: false,
  include_user_gender: false,
};

export const DEFAULT_RULES_BY_CONTEXT: Record<string, Record<string, any>> = {
  discussion: {
    ...BASE_RULES,
    audience_mode: "discussion",
    allow_persona_to_persona: true,
    persona_to_persona_probability: 0.4,
    include_user_age: false,
    include_user_gender: false,
  },
  chat: {
    ...BASE_RULES,
    audience_mode: "direct",
    allow_persona_to_persona: false,
    persona_to_persona_probability: 0,
    human_activity_required: true,
    include_user_age: true,
    include_user_gender: true,
  },
};

export const normalizeContext = (context?: string | null) => {
  if (!context) return null;
  const value = String(context).toLowerCase();
  return ALLOWED_CONTEXTS.includes(value as any) ? value : null;
};

export const sanitizeRules = (input: any, context: string) => {
  const defaults = DEFAULT_RULES_BY_CONTEXT[context] || BASE_RULES;
  const raw = parseJson(input, {}) || {};

  return {
    max_replies_per_persona: clampNumber(
      raw.max_replies_per_persona,
      1,
      10,
      defaults.max_replies_per_persona
    ),
    min_delay_ms: clampNumber(raw.min_delay_ms, 0, 120000, defaults.min_delay_ms),
    human_activity_required: toBoolean(
      raw.human_activity_required,
      defaults.human_activity_required
    ),
    allow_persona_to_persona: toBoolean(
      raw.allow_persona_to_persona,
      defaults.allow_persona_to_persona
    ),
    persona_to_persona_requires_human: toBoolean(
      raw.persona_to_persona_requires_human,
      defaults.persona_to_persona_requires_human
    ),
    persona_to_persona_probability: clampNumber(
      raw.persona_to_persona_probability,
      0,
      1,
      defaults.persona_to_persona_probability
    ),
    reply_length: raw.reply_length || defaults.reply_length || "short",
    audience_mode: raw.audience_mode || defaults.audience_mode || "discussion",
    include_user_age: toBoolean(raw.include_user_age, defaults.include_user_age),
    include_user_gender: toBoolean(
      raw.include_user_gender,
      defaults.include_user_gender
    ),
  };
};

export const buildRulePayload = (input: Record<string, any>) => {
  const context = normalizeContext(input?.context);
  if (!context) {
    throw new Error("context must be either discussion or chat");
  }

  const name = String(input?.name || `${context} defaults`).trim();
  if (!name) {
    throw new Error("name is required");
  }

  const description =
    typeof input?.description === "string" && input.description.trim()
      ? input.description.trim()
      : null;

  const rules = sanitizeRules(input?.rules, context);

  const isDefault = toBoolean(input?.is_default, false);
  const isActive = toBoolean(input?.is_active, true);

  return {
    name,
    context,
    description,
    rules,
    is_default: isDefault,
    is_active: isActive,
  };
};

export const fetchDefaultEngagementRule = async (client: any, context = "discussion") => {
  const ctx = normalizeContext(context) || "discussion";
  const { data, error } = await client
    .from("ai_engagement_rules")
    .select("*")
    .eq("context", ctx)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
};
