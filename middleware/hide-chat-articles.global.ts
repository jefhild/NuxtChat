const SUPPORTED_LOCALE_RE = /^\/(en|fr|ru|zh)(?=\/|$)/;

const GONE_RE =
  /^\/(?:articles|chat\/articles|tags|categories|people)(?:\/|$)/;

export default defineNuxtRouteMiddleware((to) => {
  const path = String(to.path || "");
  const localePrefix = path.match(SUPPORTED_LOCALE_RE)?.[0] || "";
  const normalizedPath = localePrefix
    ? path.slice(localePrefix.length) || "/"
    : path || "/";

  if (GONE_RE.test(normalizedPath)) {
    throw createError({ statusCode: 410, statusMessage: "Gone", fatal: true });
  }
});
