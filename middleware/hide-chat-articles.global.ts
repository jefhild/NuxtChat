const SUPPORTED_LOCALE_RE = /^\/(en|fr|ru|zh)(?=\/|$)/;

export default defineNuxtRouteMiddleware((to) => {
  const path = String(to.path || "");
  const localePrefix = path.match(SUPPORTED_LOCALE_RE)?.[0] || "";
  const normalizedPath = localePrefix
    ? path.slice(localePrefix.length) || "/"
    : path || "/";

  const shouldRedirect =
    /^\/articles(?:\/|$)/.test(normalizedPath) ||
    /^\/chat\/articles(?:\/|$)/.test(normalizedPath) ||
    /^\/categories(?:\/|$)/.test(normalizedPath) ||
    /^\/tags(?:\/|$)/.test(normalizedPath) ||
    /^\/people(?:\/|$)/.test(normalizedPath);

  if (!shouldRedirect) return;

  const targetPath = `${localePrefix}/chat` || "/chat";

  return navigateTo(
    {
      path: targetPath,
      query: to.query,
    },
    { redirectCode: 302 }
  );
});
