import { createError, getRequestHeader } from "h3";
import type { H3Event } from "h3";

type MoltbookVerifyResponse = {
  success?: boolean;
  valid?: boolean;
  error?: string;
  hint?: string;
  agent?: {
    id?: string;
    name?: string;
    description?: string;
    karma?: number;
    avatar_url?: string;
    is_claimed?: boolean;
    created_at?: string;
    follower_count?: number;
    following_count?: number;
    stats?: {
      posts?: number;
      comments?: number;
    };
    owner?: {
      x_handle?: string;
      x_name?: string;
      x_verified?: boolean;
    };
    human?: {
      username?: string;
      email_verified?: boolean;
    };
  };
};

const MOLTBOOK_VERIFY_URL =
  "https://www.moltbook.com/api/v1/agents/verify-identity";
const MOLTBOOK_POST_URL = "https://www.moltbook.com/api/v1/posts";

type JsonObject = Record<string, unknown>;

export type MoltbookPersonaUsage = {
  day: string | null;
  posts_today: number;
  last_post_at: string | null;
  last_post_id: string | null;
};

export type MoltbookPersonaConfig = {
  enabled: boolean;
  agent_name: string | null;
  default_submolt: string | null;
  limits: {
    daily_posts: number;
    cooldown_minutes: number;
  };
  usage: MoltbookPersonaUsage;
  credential_configured: boolean;
  credential_key_label: string | null;
};

type MoltbookPostPayload = {
  submolt_name: string;
  title: string;
  content?: string | null;
  url?: string | null;
  type?: "text" | "link" | "image";
};

type MoltbookPostResponse = {
  success?: boolean;
  data?: Record<string, unknown>;
  post?: Record<string, unknown>;
  [key: string]: unknown;
};

export const getMoltbookAudience = (config: ReturnType<typeof useRuntimeConfig>) => {
  const configured = String(config.MOLTBOOK_AUDIENCE || "").trim();
  if (configured) return configured;

  const siteUrl = String(config.public?.SITE_URL || "").trim();
  if (!siteUrl) return "imchatty.com";

  try {
    return new URL(siteUrl).host || "imchatty.com";
  } catch {
    return siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "") || "imchatty.com";
  }
};

const clampInt = (value: unknown, fallback: number, min: number, max: number) => {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
};

const toIsoDay = (date = new Date()) => date.toISOString().slice(0, 10);

const asObject = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as JsonObject;
};

export const getMoltbookAgentKeyMap = (
  config: ReturnType<typeof useRuntimeConfig>
) => {
  const raw = String(config.MOLTBOOK_AGENT_KEYS_JSON || "").trim();
  if (!raw) return {} as Record<string, string>;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {} as Record<string, string>;
    }
    return Object.entries(parsed as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        const normalizedKey = String(key || "").trim();
        const normalizedValue = String(value || "").trim();
        if (normalizedKey && normalizedValue) acc[normalizedKey] = normalizedValue;
        return acc;
      },
      {} as Record<string, string>
    );
  } catch {
    return {} as Record<string, string>;
  }
};

export const getMoltbookPersonaConfig = ({
  metadata,
  personaKey,
  config,
}: {
  metadata: unknown;
  personaKey?: string | null;
  config: ReturnType<typeof useRuntimeConfig>;
}): MoltbookPersonaConfig => {
  const meta = asObject(metadata);
  const moltbook = asObject(meta.moltbook);
  const limits = asObject(moltbook.limits);
  const usage = asObject(moltbook.usage);
  const keyMap = getMoltbookAgentKeyMap(config);
  const agentName = String(moltbook.agent_name || "").trim() || null;
  const keyLabel = agentName || String(personaKey || "").trim() || null;
  const credentialConfigured = Boolean(keyLabel && keyMap[keyLabel]);

  return {
    enabled: Boolean(moltbook.enabled),
    agent_name: agentName,
    default_submolt: String(moltbook.default_submolt || "").trim() || null,
    limits: {
      daily_posts: clampInt(limits.daily_posts, 3, 0, 100),
      cooldown_minutes: clampInt(limits.cooldown_minutes, 30, 0, 1440),
    },
    usage: {
      day: String(usage.day || "").trim() || null,
      posts_today: clampInt(usage.posts_today, 0, 0, 10000),
      last_post_at: String(usage.last_post_at || "").trim() || null,
      last_post_id: String(usage.last_post_id || "").trim() || null,
    },
    credential_configured: credentialConfigured,
    credential_key_label: keyLabel,
  };
};

export const mergeMoltbookPersonaConfig = ({
  metadata,
  personaKey,
  moltbookInput,
  config,
}: {
  metadata: unknown;
  personaKey?: string | null;
  moltbookInput?: unknown;
  config: ReturnType<typeof useRuntimeConfig>;
}) => {
  const meta = asObject(metadata);
  const current = getMoltbookPersonaConfig({ metadata, personaKey, config });
  const input = asObject(moltbookInput);
  const inputLimits = asObject(input.limits);

  const mergedCore = {
    enabled:
      typeof input.enabled === "boolean" ? input.enabled : current.enabled,
    agent_name: String(input.agent_name || "").trim() || current.agent_name,
    default_submolt:
      String(input.default_submolt || "").trim() || current.default_submolt,
    limits: {
      daily_posts: clampInt(
        inputLimits.daily_posts,
        current.limits.daily_posts,
        0,
        100
      ),
      cooldown_minutes: clampInt(
        inputLimits.cooldown_minutes,
        current.limits.cooldown_minutes,
        0,
        1440
      ),
    },
    usage: current.usage,
  };

  return {
    ...meta,
    moltbook: mergedCore,
  };
};

export const decoratePersonaWithMoltbook = ({
  persona,
  event,
}: {
  persona: Record<string, unknown>;
  event: H3Event;
}) => {
  const config = useRuntimeConfig(event);
  return {
    ...persona,
    moltbook: getMoltbookPersonaConfig({
      metadata: persona.metadata,
      personaKey: String(persona.persona_key || ""),
      config,
    }),
  };
};

export const assertMoltbookPostAllowed = (personaConfig: MoltbookPersonaConfig) => {
  if (!personaConfig.enabled) {
    throw createError({
      statusCode: 403,
      statusMessage: "Moltbook posting is disabled for this bot",
    });
  }

  if (!personaConfig.credential_configured) {
    throw createError({
      statusCode: 400,
      statusMessage: "No Moltbook agent API key is configured for this bot",
    });
  }

  const today = toIsoDay();
  const postsToday = personaConfig.usage.day === today
    ? personaConfig.usage.posts_today
    : 0;

  if (
    personaConfig.limits.daily_posts > 0 &&
    postsToday >= personaConfig.limits.daily_posts
  ) {
    throw createError({
      statusCode: 429,
      statusMessage: "Daily Moltbook post limit reached for this bot",
    });
  }

  if (personaConfig.limits.cooldown_minutes > 0 && personaConfig.usage.last_post_at) {
    const lastTs = new Date(personaConfig.usage.last_post_at).getTime();
    if (Number.isFinite(lastTs)) {
      const nextTs =
        lastTs + personaConfig.limits.cooldown_minutes * 60 * 1000;
      if (Date.now() < nextTs) {
        throw createError({
          statusCode: 429,
          statusMessage: "Moltbook cooldown still active for this bot",
          data: {
            next_allowed_at: new Date(nextTs).toISOString(),
          },
        });
      }
    }
  }
};

export const applyMoltbookPostUsage = ({
  metadata,
  personaKey,
  config,
  postId,
}: {
  metadata: unknown;
  personaKey?: string | null;
  config: ReturnType<typeof useRuntimeConfig>;
  postId?: string | null;
}) => {
  const merged = mergeMoltbookPersonaConfig({
    metadata,
    personaKey,
    config,
  });
  const now = new Date();
  const day = toIsoDay(now);
  const moltbook = asObject(merged.moltbook);
  const usage = asObject(moltbook.usage);
  const nextCount =
    String(usage.day || "") === day
      ? clampInt(usage.posts_today, 0, 0, 10000) + 1
      : 1;

  return {
    ...merged,
    moltbook: {
      ...moltbook,
      usage: {
        day,
        posts_today: nextCount,
        last_post_at: now.toISOString(),
        last_post_id: String(postId || "").trim() || null,
      },
    },
  };
};

export const createMoltbookPost = async ({
  event,
  personaKey,
  agentName,
  payload,
}: {
  event: H3Event;
  personaKey: string;
  agentName?: string | null;
  payload: MoltbookPostPayload;
}) => {
  const config = useRuntimeConfig(event);
  const keyMap = getMoltbookAgentKeyMap(config);
  const keyLabel = String(agentName || "").trim() || personaKey;
  const apiKey = keyMap[keyLabel];

  if (!apiKey) {
    throw createError({
      statusCode: 400,
      statusMessage: `Missing Moltbook agent key for "${keyLabel}"`,
    });
  }

  try {
    return await $fetch<MoltbookPostResponse>(MOLTBOOK_POST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: payload,
    });
  } catch (error: unknown) {
    const fetchError = error as FetchLikeError;
    const statusCode = Number(
      fetchError?.response?.status || fetchError?.statusCode || 502
    );
    const responseData = fetchError?.response?._data || {};
    throw createError({
      statusCode,
      statusMessage:
        responseData?.error ||
        responseData?.message ||
        "Failed to create Moltbook post",
      data: responseData,
    });
  }
};

type FetchLikeError = {
  response?: {
    status?: number;
    _data?: {
      error?: string;
      message?: string;
      [key: string]: unknown;
    };
  };
  statusCode?: number;
};

export const getMoltbookIdentityToken = (event: H3Event) => {
  const headerToken =
    getRequestHeader(event, "x-moltbook-identity") ||
    getRequestHeader(event, "X-Moltbook-Identity");

  return String(headerToken || "").trim();
};

export const verifyMoltbookIdentity = async ({
  event,
  token,
}: {
  event: H3Event;
  token: string;
}) => {
  const config = useRuntimeConfig(event);
  const appKey = String(config.MOLTBOOK_APP_KEY || "").trim();
  if (!appKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "MOLTBOOK_APP_KEY is not configured",
    });
  }

  const identityToken = String(token || "").trim();
  if (!identityToken) {
    throw createError({
      statusCode: 401,
      statusMessage: "Missing X-Moltbook-Identity header",
    });
  }

  const audience = getMoltbookAudience(config);

  let payload: MoltbookVerifyResponse;
  try {
    payload = await $fetch<MoltbookVerifyResponse>(MOLTBOOK_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Moltbook-App-Key": appKey,
      },
      body: {
        token: identityToken,
        audience,
      },
    });
  } catch (error: unknown) {
    const fetchError = error as FetchLikeError;
    const statusCode = Number(
      fetchError?.response?.status || fetchError?.statusCode || 502
    );
    const responseData = fetchError?.response?._data || {};
    throw createError({
      statusCode,
      statusMessage:
        responseData?.error || responseData?.message || "Failed to verify Moltbook identity",
      data: responseData,
    });
  }

  if (!payload?.valid || !payload?.agent?.id) {
    throw createError({
      statusCode: 401,
      statusMessage: payload?.error || "Invalid Moltbook identity token",
      data: payload?.hint ? { hint: payload.hint } : undefined,
    });
  }

  return {
    audience,
    agent: payload.agent,
    normalizedAgent: {
      id: payload.agent.id,
      name: payload.agent.name || "unknown",
      description: payload.agent.description || "",
      avatarUrl: payload.agent.avatar_url || null,
      karma: Number(payload.agent.karma || 0),
      isClaimed: Boolean(payload.agent.is_claimed),
      stats: {
        posts: Number(payload.agent.stats?.posts || 0),
        comments: Number(payload.agent.stats?.comments || 0),
      },
      owner: {
        xHandle: payload.agent.owner?.x_handle || null,
        xName: payload.agent.owner?.x_name || null,
        xVerified: Boolean(payload.agent.owner?.x_verified),
      },
      human: {
        username: payload.agent.human?.username || null,
        emailVerified: Boolean(payload.agent.human?.email_verified),
      },
    },
  };
};
