import { createError, defineEventHandler, readBody, getRequestHeader } from "h3";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  enforceEmailAuthStartLimits,
  getClientIpAddress,
  logAuthSendAttempt,
  normalizeEmail,
  verifyTurnstileToken,
} from "~/server/utils/authSendGuards";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const email = normalizeEmail(body?.email);
  const next = String(body?.next || "/chat");
  const redirectTo = body?.redirectTo ? String(body.redirectTo) : null;
  const mode = String(body?.mode || "magic").trim().toLowerCase() === "otp"
    ? "otp"
    : "magic";
  const captchaToken = String(body?.captchaToken || "").trim() || null;

  if (!email || !/.+@.+\..+/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "invalid_email" });
  }

  const cfg = useRuntimeConfig(event);
  const origin =
    cfg.public.SITE_URL ||
    `${getRequestHeader(event, "x-forwarded-proto") || "https"}://${getRequestHeader(event, "host") || "imchatty.com"}`;
  const normalizeRedirect = (value: string | null) => {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    const leadingSlash = value.startsWith("/") ? "" : "/";
    return `${origin}${leadingSlash}${value}`;
  };

  const envRedirect = normalizeRedirect(
    String(cfg.public.SUPABASE_REDIRECT || "").trim() || null
  );
  const defaultRedirect = `${origin}/callback?next=${encodeURIComponent(next)}`;
  const emailRedirectTo =
    mode === "magic"
      ? normalizeRedirect(redirectTo) || envRedirect || defaultRedirect
      : null;

  const ipAddress = getClientIpAddress(event) || null;
  const userAgent = getRequestHeader(event, "user-agent") || null;
  const logClient = await getServiceRoleClient(event);
  let captchaPassed = false;

  try {
    const captchaResult = await verifyTurnstileToken(event, captchaToken);
    captchaPassed = captchaResult.passed;

    await enforceEmailAuthStartLimits(
      { event, supabase: logClient },
      { email, ipAddress }
    );

    await logAuthSendAttempt(logClient, {
      actionType: "email_auth_start",
      email,
      ipAddress,
      userAgent,
      mode,
      captchaPassed,
      decision: "allowed",
    });

    return {
      ok: true,
      mode,
      emailRedirectTo,
      shouldCreateUser: true,
    };
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    const statusMessage = String(
      error?.statusMessage || error?.message || "email_auth_failed"
    );

    await logAuthSendAttempt(logClient, {
      actionType: "email_auth_start",
      email,
      ipAddress,
      userAgent,
      mode,
      captchaPassed,
      decision: "blocked",
      blockReason: statusMessage,
    });

    if (statusCode === 403 || statusCode === 429 || statusCode === 400) {
      throw createError({ statusCode, statusMessage });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "email_auth_failed",
    });
  }
});
