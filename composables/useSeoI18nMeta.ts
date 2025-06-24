export function useSeoI18nMeta(
  section: string,
  options?: {
    overrideUrl?: string;
    dynamic?: {
      title?: string;
      description?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      twitterTitle?: string;
      twitterDescription?: string;
      twitterImage?: string;
    };
  }
) {
  const { t, locale } = useI18n();
  const route = useRoute();
  const config = useRuntimeConfig();
  const baseUrl = config.public.SITE_URL;

  const currentLocale = locale.value || "en";
  const localePrefix = currentLocale === "en" ? "" : `/${currentLocale}`;
  const pathWithoutLocale = route.fullPath.replace(/^\/(en|fr)(?=\/|$)/, "");
  const canonicalHref =
    options?.overrideUrl || `${baseUrl}${localePrefix}${pathWithoutLocale}`;

  const key = (suffix: string) => `pages.${section}.meta.${suffix}`;
  const tf = (suffix: string): string => {
    const k = key(suffix);
    const translated = t(k);
    if (translated === k && process.dev) {
      console.warn(`[SEO META] Missing translation for key: "${k}"`);
    }
    return translated !== k ? translated : t(k, { locale: "en" });
  };

  const dynamic = options?.dynamic || {};

  useHead(() => ({
    title: dynamic.title || tf("title"),
    link: [{ rel: "canonical", href: canonicalHref }],
    meta: [
      {
        name: "description",
        content: dynamic.description || tf("description"),
      },
      { property: "og:title", content: dynamic.ogTitle || tf("ogTitle") },
      {
        property: "og:description",
        content: dynamic.ogDescription || tf("ogDescription"),
      },
      { property: "og:type", content: tf("ogType") },
      { property: "og:url", content: canonicalHref },
      { property: "og:image", content: dynamic.ogImage || tf("ogImage") },
      { name: "twitter:card", content: tf("twitterCard") },
      {
        name: "twitter:title",
        content: dynamic.twitterTitle || tf("twitterTitle"),
      },
      {
        name: "twitter:description",
        content: dynamic.twitterDescription || tf("twitterDescription"),
      },
      {
        name: "twitter:image",
        content: dynamic.twitterImage || tf("twitterImage"),
      },
    ],
  }));
}
