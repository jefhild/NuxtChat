import { createHash } from "node:crypto";
import { createError, getRequestHeader } from "h3";

type GuardContext = {
  event: any;
  supabase: any;
};

type LogAttemptInput = {
  actionType: "email_auth_start" | "link_email_start";
  email?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  authUserId?: string | null;
  mode?: string | null;
  captchaPassed?: boolean;
  decision: "allowed" | "blocked";
  blockReason?: string | null;
};

const EMAIL_AUTH_LIMITS = {
  perIp: { max: 5, windowMinutes: 15 },
  perEmail: { max: 3, windowMinutes: 60 },
  perIpEmail: { max: 2, windowMinutes: 15 },
};

const LINK_EMAIL_LIMITS = {
  perIp: { max: 10, windowMinutes: 60 },
  perUser: { max: 3, windowMinutes: 24 * 60 },
};

export const normalizeEmail = (value: unknown) =>
  String(value || "").trim().toLowerCase();

export const hashEmail = (email: string) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return "";
  return createHash("sha256").update(normalized).digest("hex");
};

export const getClientIpAddress = (event: any) => {
  const forwarded =
    getRequestHeader(event, "cf-connecting-ip") ||
    getRequestHeader(event, "x-forwarded-for") ||
    getRequestHeader(event, "x-real-ip");
  return String(forwarded || "")
    .split(",")[0]
    .trim();
};

export const verifyTurnstileToken = async (
  event: any,
  token: string | null | undefined
) => {
  const cfg = useRuntimeConfig(event);
  const captchaSecret = cfg.TURNSTILE_SECRET || process.env.TURNSTILE_SECRET;
  const captchaRequired = !!captchaSecret;

  if (!captchaRequired) return { required: false, passed: true };
  if (!token) {
    throw createError({
      statusCode: 403,
      statusMessage: "captcha_required",
    });
  }

  let passed = false;
  try {
    const body = new URLSearchParams({
      secret: captchaSecret,
      response: token,
    });
    const ip = getClientIpAddress(event);
    if (ip) body.set("remoteip", ip);
    const response = await $fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    passed = !!response?.success;
  } catch {
    passed = false;
  }

  if (!passed) {
    throw createError({
      statusCode: 403,
      statusMessage: "captcha_failed",
    });
  }

  return { required: true, passed: true };
};

const countAttemptsSince = async (
  supabase: any,
  filters: Record<string, unknown>,
  sinceIso: string
) => {
  let query = supabase
    .from("auth_send_attempts")
    .select("id", { count: "exact", head: true })
    .gte("created_at", sinceIso);

  for (const [key, value] of Object.entries(filters)) {
    if (value === null || value === undefined || value === "") continue;
    query = query.eq(key, value);
  }

  const { count, error } = await query;
  if (error) {
    console.error("[auth-send] count attempts failed:", error);
    return 0;
  }

  return Number(count || 0);
};

export const logAuthSendAttempt = async (
  supabase: any,
  input: LogAttemptInput
) => {
  const emailNormalized = normalizeEmail(input.email);
  const payload = {
    action_type: input.actionType,
    email_normalized: emailNormalized || null,
    email_hash: emailNormalized ? hashEmail(emailNormalized) : null,
    ip_address: input.ipAddress || null,
    user_agent: input.userAgent || null,
    auth_user_id: input.authUserId || null,
    mode: input.mode || null,
    captcha_passed: input.captchaPassed === true,
    decision: input.decision,
    block_reason: input.blockReason || null,
  };

  const { error } = await supabase.from("auth_send_attempts").insert(payload);
  if (error) {
    console.error("[auth-send] log attempt failed:", error);
  }
};

export const enforceEmailAuthStartLimits = async (
  ctx: GuardContext,
  {
    email,
    ipAddress,
  }: {
    email: string;
    ipAddress?: string | null;
  }
) => {
  const emailHash = hashEmail(email);
  const checks = [
    {
      filters: { action_type: "email_auth_start", ip_address: ipAddress || null },
      limit: EMAIL_AUTH_LIMITS.perIp,
      blockReason: "ip_rate_limit",
      active: !!ipAddress,
    },
    {
      filters: { action_type: "email_auth_start", email_hash: emailHash || null },
      limit: EMAIL_AUTH_LIMITS.perEmail,
      blockReason: "email_rate_limit",
      active: !!emailHash,
    },
    {
      filters: {
        action_type: "email_auth_start",
        ip_address: ipAddress || null,
        email_hash: emailHash || null,
      },
      limit: EMAIL_AUTH_LIMITS.perIpEmail,
      blockReason: "ip_email_rate_limit",
      active: !!ipAddress && !!emailHash,
    },
  ];

  for (const check of checks) {
    if (!check.active) continue;
    const sinceIso = new Date(
      Date.now() - check.limit.windowMinutes * 60 * 1000
    ).toISOString();
    const count = await countAttemptsSince(ctx.supabase, check.filters, sinceIso);
    if (count >= check.limit.max) {
      throw createError({
        statusCode: 429,
        statusMessage: check.blockReason,
      });
    }
  }
};

export const enforceLinkEmailStartLimits = async (
  ctx: GuardContext,
  {
    authUserId,
    ipAddress,
  }: {
    authUserId: string;
    ipAddress?: string | null;
  }
) => {
  const checks = [
    {
      filters: { action_type: "link_email_start", ip_address: ipAddress || null },
      limit: LINK_EMAIL_LIMITS.perIp,
      blockReason: "ip_rate_limit",
      active: !!ipAddress,
    },
    {
      filters: { action_type: "link_email_start", auth_user_id: authUserId || null },
      limit: LINK_EMAIL_LIMITS.perUser,
      blockReason: "user_rate_limit",
      active: !!authUserId,
    },
  ];

  for (const check of checks) {
    if (!check.active) continue;
    const sinceIso = new Date(
      Date.now() - check.limit.windowMinutes * 60 * 1000
    ).toISOString();
    const count = await countAttemptsSince(ctx.supabase, check.filters, sinceIso);
    if (count >= check.limit.max) {
      throw createError({
        statusCode: 429,
        statusMessage: check.blockReason,
      });
    }
  }
};
