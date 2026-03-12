import { createError, readBody, setResponseStatus } from "h3";
import type { H3Error } from "h3";
import {
  getMoltbookIdentityToken,
  verifyMoltbookIdentity,
} from "~/server/utils/moltbook";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event).catch(() => null)) || {}) as {
      identity_token?: string;
      token?: string;
    };

    const token =
      String(body.identity_token || "").trim() ||
      String(body.token || "").trim() ||
      getMoltbookIdentityToken(event);

    if (!token) {
      throw createError({
        statusCode: 401,
        statusMessage: "Missing Moltbook identity token",
      });
    }

    const result = await verifyMoltbookIdentity({ event, token });

    return {
      success: true,
      audience: result.audience,
      agent: result.normalizedAgent,
      moltbook: result.agent,
    };
  } catch (error: unknown) {
    const err = error as H3Error;
    const statusCode = Number(err?.statusCode || 500);
    setResponseStatus(event, statusCode);
    return {
      success: false,
      error:
        err?.statusMessage || err?.message || "Unable to verify Moltbook identity",
      ...(err?.data ? { details: err.data } : {}),
    };
  }
});
