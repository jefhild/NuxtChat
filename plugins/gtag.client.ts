export default defineNuxtPlugin((nuxtApp) => {
  const { gtag } = useGtag();
  const router = useRouter();
  const route = useRoute();

  const isAdminPath = (path: string) =>
    /^\/admin(\/|$)/.test(path) ||
    /^\/[a-z]{2}(?:-[A-Z]{2})?\/admin(\/|$)/.test(path);

  const trackPageView = (path: string) => {
    if (!gtag || isAdminPath(path)) return;
    gtag("event", "page_view", {
      page_path: path,
      page_location: window.location.href,
      page_title: document.title,
    });
  };

  nuxtApp.hook("app:mounted", () => {
    trackPageView(route.fullPath);
  });

  router.afterEach((to) => {
    trackPageView(to.fullPath);
  });
});
