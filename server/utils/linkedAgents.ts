import { createError } from "h3";
import type { H3Event } from "h3";
import type { SupabaseClient } from "@supabase/supabase-js";

const LINKED_AGENTS_BASE_URL = "https://linkedagents.live";
const DEFAULT_LINKED_AGENTS_TIMEOUT_MS = 7000;

type JsonRecord = Record<string, unknown>;

type FetchLikeError = {
  name?: string;
  message?: string;
  response?: {
    status?: number;
    _data?: {
      error?: string | { message?: string };
      message?: string;
      [key: string]: unknown;
    };
  };
  statusCode?: number;
};

type LinkedAgentsJournalPayload = {
  entry_text: string;
  origin: "agent";
  entry_payload?: JsonRecord;
};

type LinkedAgentsResponse = JsonRecord | JsonRecord[];

const normalizeText = (value: unknown, maxLength: number) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const normalizeUrlBase = (value: unknown) => {
  const raw = String(value || "").trim() || "https://imchatty.com";
  return raw.replace(/\/+$/, "");
};

const getDay = (date = new Date()) => date.toISOString().slice(0, 10);

const asArray = (value: unknown): JsonRecord[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => item && typeof item === "object") as JsonRecord[];
  }
  if (value && typeof value === "object") {
    const record = value as JsonRecord;
    for (const key of ["data", "entries", "journal", "items", "results"]) {
      if (Array.isArray(record[key])) return asArray(record[key]);
    }
  }
  return [];
};

const pickDailyItem = <T>(items: T[], day: string) => {
  if (!items.length) return null;
  const seed = day.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return items[seed % items.length] || items[0];
};

export const getLinkedAgentsConfig = (config: ReturnType<typeof useRuntimeConfig>) => {
  const agentId = String(config.LINKED_AGENTS_AGENT_ID || "").trim();
  const apiKey = String(config.LINKED_AGENTS_API_KEY || "").trim();
  const handle = String(config.LINKED_AGENTS_HANDLE || "imchatty-agent").trim();

  return {
    enabled:
      String(config.LINKED_AGENTS_ENABLED || "false").trim().toLowerCase() === "true",
    baseUrl: String(config.LINKED_AGENTS_BASE_URL || LINKED_AGENTS_BASE_URL)
      .trim()
      .replace(/\/+$/, ""),
    agentId,
    apiKey,
    handle,
    tags: String(
      config.LINKED_AGENTS_TAGS ||
        "ai-companions,anonymous-chat,social-discovery"
    )
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10),
    githubUrl: String(config.LINKED_AGENTS_GITHUB_URL || "").trim(),
    xUrl: String(config.LINKED_AGENTS_X_URL || "").trim(),
    timeoutMs: Math.min(
      Math.max(
        Number.parseInt(
          String(config.LINKED_AGENTS_REQUEST_TIMEOUT_MS || ""),
          10
        ) || DEFAULT_LINKED_AGENTS_TIMEOUT_MS,
        1000
      ),
      20000
    ),
  };
};

const requestLinkedAgents = async <T extends LinkedAgentsResponse>({
  event,
  path,
  method = "GET",
  body,
  authenticated = false,
  timeoutMs,
}: {
  event: H3Event;
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: JsonRecord;
  authenticated?: boolean;
  timeoutMs?: number;
}) => {
  const linkedAgents = getLinkedAgentsConfig(useRuntimeConfig(event));
  const requestTimeoutMs = Math.min(
    Math.max(Number(timeoutMs) || linkedAgents.timeoutMs, 1000),
    linkedAgents.timeoutMs
  );

  if (authenticated && !linkedAgents.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "LinkedAgents API key is not configured",
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, requestTimeoutMs);

  try {
    return await $fetch<T>(`${linkedAgents.baseUrl}${path}`, {
      method,
      timeout: requestTimeoutMs,
      signal: controller.signal,
      headers: {
        ...(authenticated
          ? { Authorization: `Bearer ${linkedAgents.apiKey}` }
          : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body } : {}),
    });
  } catch (error: unknown) {
    const fetchError = error as FetchLikeError;
    const responseData = fetchError?.response?._data || {};
    const responseError = responseData?.error;
    const isTimeout =
      fetchError?.name === "TimeoutError" ||
      fetchError?.name === "AbortError" ||
      String(fetchError?.message || "").toLowerCase().includes("timeout");

    if (isTimeout) {
      throw createError({
        statusCode: 502,
        statusMessage: `LinkedAgents request timed out after ${requestTimeoutMs}ms`,
        data: {
          upstream: linkedAgents.baseUrl,
          path,
          timeout_ms: requestTimeoutMs,
        },
      });
    }

    throw createError({
      statusCode: Number(
        fetchError?.response?.status || fetchError?.statusCode || 502
      ),
      statusMessage:
        (typeof responseError === "object" ? responseError?.message : null) ||
        responseData?.message ||
        (typeof responseError === "string" ? responseError : null) ||
        "LinkedAgents request failed",
      data: {
        upstream: linkedAgents.baseUrl,
        path,
        response: responseData,
      },
    });
  } finally {
    clearTimeout(timeoutId);
  }
};

export const createLinkedAgentsJournalEntry = async ({
  event,
  payload,
}: {
  event: H3Event;
  payload: LinkedAgentsJournalPayload;
}) => {
  const linkedAgents = getLinkedAgentsConfig(useRuntimeConfig(event));
  if (!linkedAgents.agentId) {
    throw createError({
      statusCode: 500,
      statusMessage: "LinkedAgents agent id is not configured",
    });
  }

  return requestLinkedAgents<JsonRecord>({
    event,
    path: `/api/agents/${encodeURIComponent(linkedAgents.agentId)}/journal`,
    method: "POST",
    authenticated: true,
    body: payload,
  });
};

export const hasLinkedAgentsJournalForDay = async ({
  event,
  day,
  marker,
}: {
  event: H3Event;
  day: string;
  marker: string;
}) => {
  const linkedAgents = getLinkedAgentsConfig(useRuntimeConfig(event));
  if (!linkedAgents.agentId) return false;

  const response = await requestLinkedAgents<LinkedAgentsResponse>({
    event,
    path: `/api/agents/${encodeURIComponent(
      linkedAgents.agentId
    )}/journal?limit=10`,
    timeoutMs: Math.min(linkedAgents.timeoutMs, 2500),
  }).catch(() => []);

  return asArray(response).some((entry) => {
    const text = String(
      entry.entry_text || entry.text || entry.message || ""
    ).trim();
    const payload = entry.entry_payload || entry.payload;
    const payloadDay =
      payload && typeof payload === "object"
        ? String((payload as JsonRecord).day || "").trim()
        : "";
    return payloadDay === day || text.includes(marker);
  });
};

export const buildDailyProfileJournal = async ({
  supabase,
  event,
}: {
  supabase: SupabaseClient;
  event: H3Event;
}) => {
  const config = useRuntimeConfig(event);
  const siteUrl = normalizeUrlBase(config.public?.SITE_URL);
  const day = getDay();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select(
      "id, user_id, displayname, slug, tagline, bio, avatar_url, is_ai, last_active, provider"
    )
    .eq("is_private", false)
    .not("provider", "is", null)
    .neq("provider", "anonymous")
    .not("slug", "is", null)
    .not("displayname", "is", null)
    .order("last_active", { ascending: false, nullsFirst: false })
    .limit(50);

  if (error) throw error;

  const candidates = ((profiles || []) as JsonRecord[]).filter((profile) => {
    const displayName = normalizeText(profile.displayname, 80);
    const slug = normalizeText(profile.slug, 120);
    return Boolean(displayName && slug);
  });

  const profile = pickDailyItem(candidates, day);
  if (!profile) {
    throw createError({
      statusCode: 404,
      statusMessage: "No public profile is available for LinkedAgents posting",
    });
  }

  const displayName = normalizeText(profile.displayname, 80);
  const tagline = normalizeText(profile.tagline, 180);
  const bio = normalizeText(profile.bio, 360);
  const slug = normalizeText(profile.slug, 120);
  const profileUrl = `${siteUrl}/profiles/${encodeURIComponent(slug)}`;
  const marker = `Daily profile spotlight for ${day}`;
  const kind = profile.is_ai ? "AI companion" : "member";

  const entryText = [
    `<b>${marker}</b>`,
    `<br>`,
    `Today's public ${kind} spotlight is <b>${escapeHtml(displayName)}</b>.`,
    tagline ? `<br><i>${escapeHtml(tagline)}</i>` : "",
    bio ? `<br>${escapeHtml(bio)}` : "",
    `<br>${escapeHtml(profileUrl)}`,
  ]
    .filter(Boolean)
    .join("");

  return {
    day,
    marker,
    entry_text: entryText,
    entry_payload: {
      source: "imchatty",
      kind: "daily_profile_spotlight",
      day,
      profile_slug: slug,
      profile_url: profileUrl,
      profile_is_ai: Boolean(profile.is_ai),
    },
  };
};

export const runLinkedAgentsDailyProfilePost = async ({
  event,
  supabase,
  dryRun = false,
}: {
  event: H3Event;
  supabase: SupabaseClient;
  dryRun?: boolean;
}) => {
  const linkedAgents = getLinkedAgentsConfig(useRuntimeConfig(event));
  if (!linkedAgents.enabled) {
    throw createError({
      statusCode: 400,
      statusMessage: "LinkedAgents automation is disabled",
    });
  }
  if (!linkedAgents.agentId || !linkedAgents.apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "LinkedAgents credentials are not configured",
    });
  }

  const draft = await buildDailyProfileJournal({ supabase, event });
  const alreadyPosted = await hasLinkedAgentsJournalForDay({
    event,
    day: draft.day,
    marker: draft.marker,
  });

  if (alreadyPosted) {
    return {
      status: "skipped",
      reason: "already_posted_today",
      draft,
    };
  }

  if (dryRun) {
    return {
      status: "preview",
      draft,
    };
  }

  const response = await createLinkedAgentsJournalEntry({
    event,
    payload: {
      entry_text: draft.entry_text,
      origin: "agent",
      entry_payload: draft.entry_payload,
    },
  });

  return {
    status: "posted",
    draft,
    linked_agents: response,
  };
};
