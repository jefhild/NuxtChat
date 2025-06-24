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
  const { t, locale, locales, localeCodes } = useI18n();
  const route = useRoute();
  const config = useRuntimeConfig();
  const baseUrl = config.public.SITE_URL;
  const currentLocale = locale.value || "en";

  // Strip any leading locale prefix
  const pathWithoutLocale = route.fullPath.replace(/^\/[a-z]{2}(?=\/|$)/, "");

  // Canonical URL (current locale)
  const localePrefix = currentLocale === "en" ? "" : `/${currentLocale}`;
  const canonicalHref =
    options?.overrideUrl || `${baseUrl}${localePrefix}${pathWithoutLocale}`;

  // Build hreflang links for all locales


  const hreflangMap: Record<string, string> = {
    en: "en-US",
    fr: "fr-FR",
    ru: "ru-RU",
    zh: "zh-CN",
  };
  const hreflangLinks = (localeCodes?.value || []).map((code) => {
    const hreflang = hreflangMap[code] || code;
    const href =
      code === "en"
        ? `${baseUrl}${pathWithoutLocale}`
        : `${baseUrl}/${code}${pathWithoutLocale}`;
    return {
      rel: "alternate",
      hreflang,
      href,
    };
  });

  // Add x-default fallback (point to English)
  hreflangLinks.push({
    rel: "alternate",
    hreflang: "x-default",
    href: `${baseUrl}${pathWithoutLocale}`,
  });

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
    link: [
      { rel: "canonical", href: canonicalHref },
      ...hreflangLinks, // ✅ Add all hreflangs
    ],
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
