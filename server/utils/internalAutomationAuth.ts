import { createError, getRequestHeader } from "h3";

const readBearerToken = (event: any) => {
  const authHeader = String(getRequestHeader(event, "authorization") || "").trim();
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
};

export const ensureAutomationSecret = (event: any) => {
  const config = useRuntimeConfig(event);
  const expectedSecret = String(
    config.MOLTBOOK_AUTOMATION_SECRET ||
      config.AUTOMATION_SECRET ||
      process.env.MOLTBOOK_AUTOMATION_SECRET ||
      process.env.AUTOMATION_SECRET ||
      ""
  ).trim();

  if (!expectedSecret) {
    throw createError({
      statusCode: 500,
      statusMessage: "Automation secret is not configured",
    });
  }

  const providedSecret =
    String(getRequestHeader(event, "x-automation-secret") || "").trim() ||
    String(getRequestHeader(event, "x-cron-secret") || "").trim() ||
    readBearerToken(event);

  if (!providedSecret || providedSecret !== expectedSecret) {
    throw createError({
      statusCode: 401,
      statusMessage: "Invalid automation secret",
    });
  }
};
