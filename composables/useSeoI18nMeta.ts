export function useSeoI18nMeta(
  section: string,
  options?: { overrideUrl?: string }
) {
  const { t } = useI18n();
  const route = useRoute();
  const config = useRuntimeConfig();

  const baseUrl = config.public.SITE_URL;
  const canonicalHref = options?.overrideUrl || `${baseUrl}${route.fullPath}`;

  console.log("baseUrl ", baseUrl)

  const key = (suffix: string) => `pages.${section}.meta.${suffix}`;
  const tf = (suffix: string) => {
    const k = key(suffix);
    const translated = t(k);
    if (translated === k && process.dev) {
      console.warn(`[SEO META] Missing translation for key: "${k}"`);
    }
    return translated !== k ? translated : t(k, { locale: "en" });
  };

  useHead(() => ({
    title: tf("title"),
    link: [
      {
        rel: "canonical",
        href: canonicalHref,
      },
    ],
    meta: [
      { name: "description", content: tf("description") },
      { property: "og:title", content: tf("ogTitle") },
      { property: "og:description", content: tf("ogDescription") },
      { property: "og:type", content: tf("ogType") },
      { property: "og:url", content: tf("ogUrl") || canonicalHref },
      { property: "og:image", content: tf("ogImage") },
      { name: "twitter:card", content: tf("twitterCard") },
      { name: "twitter:title", content: tf("twitterTitle") },
      { name: "twitter:description", content: tf("twitterDescription") },
      { name: "twitter:image", content: tf("twitterImage") },
    ],
  }));
}
