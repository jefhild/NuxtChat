import { getAllDynamicRoutesWithMetadata } from "~/composables/useDynamicRoutes";

async function sendSitemapFailureAlert(payload: {
  reason: string;
  details?: string;
  path: string;
}) {
  const runtime = useRuntimeConfig();
  const hook =
    runtime.SITEMAP_ALERT_WEBHOOK_URL ||
    process.env.SITEMAP_ALERT_WEBHOOK_URL ||
    "";

  if (!hook) {
    console.error("[sitemap] alert hook not configured", payload);
    return;
  }

  try {
    await $fetch(hook, {
      method: "POST",
      body: {
        source: "server/api/sitemap/urls",
        level: "error",
        timestamp: new Date().toISOString(),
        ...payload,
      },
    });
  } catch (alertError) {
    console.error("[sitemap] failed to send alert hook", {
      payload,
      alertError,
    });
  }
}

export default defineEventHandler(async (event) => {
  let routes: unknown;

  try {
    routes = await getAllDynamicRoutesWithMetadata();
  } catch (error) {
    const details =
      error instanceof Error ? `${error.name}: ${error.message}` : String(error);
    console.error("[sitemap] failed to generate urls", { error });
    await sendSitemapFailureAlert({
      reason: "upstream_fetch_failed",
      details,
      path: getRequestURL(event).pathname,
    });
    throw createError({
      statusCode: 503,
      statusMessage: "Sitemap source unavailable",
    });
  }

  if (!Array.isArray(routes)) {
    const details = `Expected array from getAllDynamicRoutesWithMetadata, got ${typeof routes}`;
    console.error("[sitemap] invalid upstream result", { details, routes });
    await sendSitemapFailureAlert({
      reason: "invalid_upstream_result",
      details,
      path: getRequestURL(event).pathname,
    });
    throw createError({
      statusCode: 503,
      statusMessage: "Sitemap source unavailable",
    });
  }

  return routes;
});
