import { unref } from "vue";

export function useSeoI18nMeta(
  section: string,
  options?: {
    overrideUrl?: string;
    availableLocaleCodes?: string[] | { value: string[] };
    robots?: string | { value: string };
    dynamic?: {
      title?: string;
      description?: string;
      ogTitle?: string;
      ogDescription?: string;
      ogImage?: string;
      ogType?: string;
      twitterTitle?: string;
      twitterDescription?: string;
      twitterImage?: string;
    };
  }
) {
  const { t, locale, locales, localeCodes } = useI18n();
  const route = useRoute();
  const switchLocalePath = useSwitchLocalePath();
  const config = useRuntimeConfig();
  const siteConfig = useSiteConfig();
  const baseUrl = siteConfig?.url || config.public.SITE_URL || "";
  const siteName = siteConfig?.name || "ImChatty";
  const currentLocale = locale.value || "en";

  const toAbsoluteUrl = (path?: string | null) => {
    if (!path) return null;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${normalized === "/" ? "" : normalized}`;
  };

  // Canonical URL (current locale)
  const canonicalPath = switchLocalePath(currentLocale) || route.path || "/";
  const canonicalHref =
    options?.overrideUrl || toAbsoluteUrl(canonicalPath) || canonicalPath;

  // Build hreflang links for all locales

  const hreflangMap: Record<string, string> = {
    en: "en-US",
    fr: "fr-FR",
    ru: "ru-RU",
    zh: "zh-CN",
  };

  const localeIso =
    locales?.value?.find?.((l: any) => l?.code === currentLocale)?.iso ||
    hreflangMap[currentLocale] ||
    "en-US";
  const ogLocale = String(localeIso).replace("-", "_");

  const configuredLocaleCodes = localeCodes?.value || [];
  const rawAvailableLocaleCodes = unref(options?.availableLocaleCodes as any);
  const allowedLocaleCodes = Array.isArray(rawAvailableLocaleCodes)
    ? rawAvailableLocaleCodes
    : configuredLocaleCodes;
  const localeCodeSet = new Set(allowedLocaleCodes);
  const finalLocaleCodes = configuredLocaleCodes.filter((code) =>
    localeCodeSet.has(code)
  );

  const hreflangLinks = finalLocaleCodes
    .map((code) => {
      const path = switchLocalePath(code);
      const href = toAbsoluteUrl(path);
      if (!href) return null;
      const hreflang = hreflangMap[code] || code;
      return {
        rel: "alternate",
        hreflang,
        href,
      };
    })
    .filter(Boolean) as Array<{ rel: string; hreflang: string; href: string }>;

  // Add x-default fallback (point to English)
  const defaultLocale = "en";
  const defaultPath = switchLocalePath(defaultLocale);
  const defaultHref = toAbsoluteUrl(defaultPath);
  if (defaultHref && localeCodeSet.has(defaultLocale)) {
    hreflangLinks.push({
      rel: "alternate",
      hreflang: "x-default",
      href: defaultHref,
    });
  }

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
      ...(unref(options?.robots as any)
        ? [
            {
              name: "robots",
              content: unref(options?.robots as any),
            },
          ]
        : []),
      { property: "og:site_name", content: siteName },
      { property: "og:locale", content: ogLocale },
      { property: "og:title", content: dynamic.ogTitle || tf("ogTitle") },
      {
        property: "og:description",
        content: dynamic.ogDescription || tf("ogDescription"),
      },
      { property: "og:type", content: dynamic.ogType || tf("ogType") },
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
