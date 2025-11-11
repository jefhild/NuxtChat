import { randomBytes } from "node:crypto";

const DEFAULT_MODERATION_CONFIG = {
  enabled: false,
  blocked_terms: [],
  toxicity_threshold: 0.85,
  spam_threshold: 0.9,
  actions: {
    on_severe_toxicity: "delete",
    on_toxicity: "warn",
    on_spam: "mute",
    on_profanity: "soft_warn",
    fallback: "allow",
  },
  escalate_to_user_id: null,
};

export const AI_PERSONA_SELECT = `
  id,
  persona_key,
  profile_user_id,
  role,
  is_active,
  model,
  temperature,
  top_p,
  presence_penalty,
  frequency_penalty,
  max_response_tokens,
  max_history_messages,
  system_prompt_template,
  response_style_template,
  dynamic_fields,
  parameters,
  metadata,
  moderation_config,
  created_at,
  updated_at,
  profile:profiles!ai_personas_profile_user_id_fkey (
    user_id,
    displayname,
    avatar_url,
    slug,
    tagline,
    bio,
    age,
    gender_id,
    status_id,
    is_ai,
    avatar_decoration_url
  )
`;

const clamp = (value: number, min: number, max: number) => {
  if (!Number.isFinite(value)) return min;
  return Math.min(Math.max(value, min), max);
};

export const slugify = (value = "") =>
  String(value)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const ensureSlug = (value: string, fallback = "bot") => {
  const slug = slugify(value);
  if (slug) return slug;
  return `${fallback}-${randomBytes(3).toString("hex")}`;
};

const toNumberOrNull = (value: unknown, fallback: number | null = null) => {
  const num = Number(value);
  if (Number.isFinite(num)) return num;
  return fallback;
};

export const parseJsonField = (
  value: unknown,
  fallback: Record<string, unknown> | unknown[] | null
) => {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }

  if (typeof value === "object") {
    return value as Record<string, unknown> | unknown[] | null;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }

  return fallback;
};

export const buildProfilePayload = (input: Record<string, any>) => {
  const displayname = String(input?.displayname ?? "").trim();
  if (!displayname) {
    throw new Error("Display name is required.");
  }

  const slug = ensureSlug(
    input?.slug || displayname,
    `bot-${randomBytes(2).toString("hex")}`
  );

  return {
    user_id: input?.user_id,
    displayname,
    slug,
    avatar_url: input?.avatar_url || null,
    tagline: input?.tagline || null,
    bio: input?.bio || null,
    age: toNumberOrNull(input?.age),
    gender_id: toNumberOrNull(input?.gender_id),
    status_id: toNumberOrNull(input?.status_id),
    avatar_decoration_url: input?.avatar_decoration_url || null,
    is_ai: true,
  };
};

export const buildPersonaPayload = (
  input: Record<string, any>,
  profileUserId: string
) => {
  const personaKey = slugify(
    input?.persona_key || input?.profile?.displayname || input?.profile?.slug
  );

  if (!personaKey) {
    throw new Error("Persona key or display name is required.");
  }

  const systemPrompt = String(input?.system_prompt_template ?? "").trim();
  if (!systemPrompt) {
    throw new Error("System prompt template is required.");
  }

  const responseStyle = input?.response_style_template ?? null;

  return {
    persona_key: personaKey,
    profile_user_id: profileUserId,
    role: input?.role || "assistant",
    is_active: typeof input?.is_active === "boolean" ? input.is_active : true,
    model: String(input?.model || "gpt-4o-mini"),
    temperature: clamp(toNumberOrNull(input?.temperature, 0.7) ?? 0.7, 0, 2),
    top_p: clamp(toNumberOrNull(input?.top_p, 1) ?? 1, 0.01, 1),
    presence_penalty: clamp(
      toNumberOrNull(input?.presence_penalty, 0) ?? 0,
      -2,
      2
    ),
    frequency_penalty: clamp(
      toNumberOrNull(input?.frequency_penalty, 0) ?? 0,
      -2,
      2
    ),
    max_response_tokens:
      toNumberOrNull(input?.max_response_tokens, 600) ?? 600,
    max_history_messages:
      toNumberOrNull(input?.max_history_messages, 10) ?? 10,
    system_prompt_template: systemPrompt,
    response_style_template:
      responseStyle === "" ? null : responseStyle ?? null,
    dynamic_fields: parseJsonField(input?.dynamic_fields, []),
    parameters: parseJsonField(input?.parameters, {}),
    metadata: parseJsonField(input?.metadata, {}),
    moderation_config: parseJsonField(
      input?.moderation_config,
      DEFAULT_MODERATION_CONFIG
    ),
  };
};

export const getServiceRoleClient = async (event: any) => {
  const { useDb } = await import("@/composables/useDB");
  const { getServerClientFrom } = useDb();
  const cfg = useRuntimeConfig(event);
  return getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );
};

export const generateBotEmail = (personaKey: string) => {
  const slug = ensureSlug(personaKey || "bot", "bot");
  return `${slug}@bots.imchatty.local`;
};

export const generateBotPassword = () => randomBytes(16).toString("hex");

export const fetchPersonaById = async (client: any, id: string) => {
  return client
    .from("ai_personas")
    .select(AI_PERSONA_SELECT)
    .eq("id", id)
    .single();
};
