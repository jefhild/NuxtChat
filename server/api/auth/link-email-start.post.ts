import { createError, defineEventHandler, readBody, getRequestHeader } from "h3";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  enforceLinkEmailStartLimits,
  getClientIpAddress,
  logAuthSendAttempt,
  normalizeEmail,
} from "~/server/utils/authSendGuards";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "unauthorized" });
  }

  const body = await readBody(event);
  const email = normalizeEmail(body?.email);
  const next = String(body?.next || "/settings");
  const redirectTo = body?.redirectTo ? String(body.redirectTo) : null;
  if (!email || !/.+@.+\..+/.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "invalid_email" });
  }

  const logClient = await getServiceRoleClient(event);
  const ipAddress = getClientIpAddress(event) || null;
  const userAgent = getRequestHeader(event, "user-agent") || null;

  try {
    await enforceLinkEmailStartLimits(
      { event, supabase: logClient },
      { authUserId: user.id, ipAddress }
    );

    const authClient = await serverSupabaseClient(event);
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
    const emailRedirectTo =
      normalizeRedirect(redirectTo) ||
      `${origin}/callback?next=${encodeURIComponent(next)}`;

    const { data, error } = await authClient.auth.updateUser(
      { email },
      { emailRedirectTo }
    );

    if (error) {
      throw error;
    }

    await logAuthSendAttempt(logClient, {
      actionType: "link_email_start",
      email,
      ipAddress,
      userAgent,
      authUserId: user.id,
      decision: "allowed",
    });

    return { ok: true, data };
  } catch (error: any) {
    const statusCode = Number(error?.statusCode || error?.status || 500);
    const statusMessage = String(
      error?.statusMessage || error?.message || "link_email_failed"
    );

    await logAuthSendAttempt(logClient, {
      actionType: "link_email_start",
      email,
      ipAddress,
      userAgent,
      authUserId: user.id,
      decision: "blocked",
      blockReason: statusMessage,
    });

    if (statusCode === 401 || statusCode === 400 || statusCode === 429) {
      throw createError({ statusCode, statusMessage });
    }

    throw createError({
      statusCode: 500,
      statusMessage: "link_email_failed",
    });
  }
});
