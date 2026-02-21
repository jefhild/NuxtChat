export default defineNuxtRouteMiddleware((to) => {
  const path = String(to.path || "");
  if (!/\/chat\/articles(?:\/|$)/.test(path)) return;

  const targetPath = path.replace("/chat/articles", "/articles");
  const hasArticleSlug = /\/articles\/[^/]+$/.test(targetPath);
  const hash = to.hash || (hasArticleSlug ? "#discussion" : "");

  return navigateTo(
    {
      path: targetPath,
      query: to.query,
      hash,
    },
    { redirectCode: 302 }
  );
});
