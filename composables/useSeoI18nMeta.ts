import { unref } from "vue";

export function useSeoI18nMeta(
  section: string,
  options?: {
    overrideUrl?: string | { value: string };
    canonicalLocaleCode?: string | { value: string };
    availableLocaleCodes?: string[] | { value: string[] };
    robots?: string | { value: string };
    dynamic?: {
      title?: string | { value: string };
      description?: string | { value: string };
      ogTitle?: string | { value: string };
      ogDescription?: string | { value: string };
      ogImage?: string | { value: string };
      ogImageAlt?: string | { value: string };
      ogImageWidth?: string | number | { value: string | number };
      ogImageHeight?: string | number | { value: string | number };
      ogType?: string | { value: string };
      twitterCard?: string | { value: string };
      twitterSite?: string | { value: string };
      twitterTitle?: string | { value: string };
      twitterDescription?: string | { value: string };
      twitterImage?: string | { value: string };
    };
  }
) {
  const { t, te, locale, locales, localeCodes } = useI18n();
  const route = useRoute();
  const switchLocalePath = useSwitchLocalePath();
  const config = useRuntimeConfig();
  const siteConfig = useSiteConfig();
  const baseUrl = String(siteConfig?.url || config.public.SITE_URL || "").replace(
    /\/+$/,
    ""
  );
  const siteName = siteConfig?.name || "ImChatty";
  const currentLocale = computed(
    () =>
      String(locale.value || "en")
        .trim()
        .toLowerCase()
        .split("-")[0]
  );
  const canonicalLocaleCode = computed(
    () =>
      String(unref(options?.canonicalLocaleCode as any) || currentLocale.value || "en")
        .trim()
        .toLowerCase()
        .split("-")[0] || "en"
  );

  const normalizeUrl = (value?: string | null) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    if (/^https?:\/\//i.test(raw)) {
      try {
        const parsed = new URL(raw);
        parsed.hash = "";
        if (parsed.pathname !== "/") {
          parsed.pathname = parsed.pathname.replace(/\/+$/, "");
        }
        return parsed.toString();
      } catch {
        return raw.replace(/\/+$/, "");
      }
    }

    if (raw === "/") return raw;
    return raw.startsWith("/") ? raw.replace(/\/+$/, "") : `/${raw.replace(/\/+$/, "")}`;
  };

  const toAbsoluteUrl = (path?: string | null) => {
    if (!path) return null;
    const normalizedPath = normalizeUrl(path);
    if (!normalizedPath) return null;
    const normalized = normalizedPath.startsWith("/")
      ? normalizedPath
      : `/${normalizedPath}`;
    return normalizeUrl(
      `${baseUrl}${normalized === "/" ? "" : normalized}`
    );
  };

  // Build hreflang links for all locales

  const hreflangMap: Record<string, string> = {
    en: "en-US",
    fr: "fr-FR",
    ru: "ru-RU",
    zh: "zh-CN",
  };

  const configuredLocaleCodes = computed(() => localeCodes?.value || []);
  const allowedLocaleCodes = computed(() => {
    const raw = unref(options?.availableLocaleCodes as any);
    return Array.isArray(raw) ? raw : configuredLocaleCodes.value;
  });
  const finalLocaleCodes = computed(() => {
    const normalizedAllowed = new Set(
      allowedLocaleCodes.value.map((code: string) =>
        String(code || "").trim().toLowerCase().split("-")[0]
      )
    );
    return configuredLocaleCodes.value.filter((code: string) =>
      normalizedAllowed.has(String(code || "").trim().toLowerCase().split("-")[0])
    );
  });
  const localeCodeSet = computed(() => new Set(finalLocaleCodes.value));
  const canonicalPath = computed(
    () =>
      switchLocalePath(canonicalLocaleCode.value) ||
      switchLocalePath(currentLocale.value) ||
      route.path ||
      "/"
  );
  const canonicalHref = computed(
    () =>
      normalizeUrl(unref(options?.overrideUrl as any)) ||
      toAbsoluteUrl(canonicalPath.value) ||
      normalizeUrl(canonicalPath.value)
  );
  const localeIso = computed(
    () =>
      locales?.value?.find?.((l: any) => l?.code === currentLocale.value)?.iso ||
      hreflangMap[currentLocale.value] ||
      "en-US"
  );
  const ogLocale = computed(() => String(localeIso.value).replace("-", "_"));
  const ogAlternateLocales = computed(() =>
    locales.value
      .map((localeEntry: any) => {
        const code = String(localeEntry?.code || "")
          .trim()
          .toLowerCase()
          .split("-")[0];
        if (
          !code ||
          code === currentLocale.value ||
          !Array.from(localeCodeSet.value).includes(code)
        ) {
          return null;
        }
        const iso = String(localeEntry?.iso || hreflangMap[code] || code);
        return iso.replace("-", "_");
      })
      .filter(Boolean)
  );
  const hreflangLinks = computed(() => {
    const hreflangByCode = new Map<
      string,
      { rel: string; hreflang: string; href: string }
    >();
    for (const code of finalLocaleCodes.value) {
      const normalizedCode = String(code || "")
        .trim()
        .toLowerCase()
        .split("-")[0];
      if (!normalizedCode) continue;
      const hreflang = hreflangMap[normalizedCode] || normalizedCode;
      const path = switchLocalePath(normalizedCode);
      const defaultHref = toAbsoluteUrl(path);
      const href =
        normalizedCode === canonicalLocaleCode.value && canonicalHref.value
          ? canonicalHref.value
          : defaultHref;
      if (!href) continue;
      hreflangByCode.set(hreflang, {
        rel: "alternate",
        hreflang,
        href,
      });
    }

    const currentHreflang = hreflangMap[currentLocale.value] || currentLocale.value;
    if (!hreflangByCode.has(currentHreflang)) {
      const currentPath = switchLocalePath(currentLocale.value) || route.path || "/";
      const currentHref =
        currentLocale.value === canonicalLocaleCode.value && canonicalHref.value
          ? canonicalHref.value
          : toAbsoluteUrl(currentPath);
      if (currentHref) {
        hreflangByCode.set(currentHreflang, {
          rel: "alternate",
          hreflang: currentHreflang,
          href: currentHref,
        });
      }
    }

    const defaultLocale = "en";
    const defaultPath = switchLocalePath(defaultLocale);
    const defaultHref =
      currentLocale.value === defaultLocale && canonicalHref.value
        ? canonicalHref.value
        : toAbsoluteUrl(defaultPath);
    const links = Array.from(hreflangByCode.values());
    if (defaultHref && localeCodeSet.value.has(defaultLocale)) {
      links.push({
        rel: "alternate",
        hreflang: "x-default",
        href: defaultHref,
      });
    }
    return links;
  });

  const key = (suffix: string) => `pages.${section}.meta.${suffix}`;
  const hasKey = (k: string, loc?: string) => {
    try {
      return Boolean(loc ? te(k, loc) : te(k));
    } catch {
      return false;
    }
  };
  const tm = (suffix: string): string => {
    const k = key(suffix);
    if (hasKey(k)) return String(t(k));
    if (hasKey(k, "en")) return String(t(k, { locale: "en" }));
    return "";
  };
  const tf = (suffix: string): string => {
    const k = key(suffix);
    if (hasKey(k)) return String(t(k));
    if (hasKey(k, "en")) return String(t(k, { locale: "en" }));
    if (import.meta.dev) {
      console.warn(`[SEO META] Missing translation for key: "${k}"`);
    }
    return "";
  };

  const dynamic = options?.dynamic || {};
  const dynamicValue = <T>(value: T | { value: T } | undefined): T | undefined =>
    unref(value as any);
  const dynamicTitle = computed(() => String(dynamicValue(dynamic.title) || ""));
  const dynamicDescription = computed(() =>
    String(dynamicValue(dynamic.description) || "")
  );
  const dynamicOgTitle = computed(() =>
    String(dynamicValue(dynamic.ogTitle) || "")
  );
  const dynamicOgDescription = computed(() =>
    String(dynamicValue(dynamic.ogDescription) || "")
  );
  const dynamicOgImage = computed(() =>
    String(dynamicValue(dynamic.ogImage) || "")
  );
  const dynamicOgImageAlt = computed(() =>
    String(dynamicValue(dynamic.ogImageAlt) || "")
  );
  const dynamicOgType = computed(() =>
    String(dynamicValue(dynamic.ogType) || "")
  );
  const dynamicTwitterCard = computed(() =>
    String(dynamicValue(dynamic.twitterCard) || "")
  );
  const dynamicTwitterSite = computed(() =>
    String(dynamicValue(dynamic.twitterSite) || "")
  );
  const dynamicTwitterTitle = computed(() =>
    String(dynamicValue(dynamic.twitterTitle) || "")
  );
  const dynamicTwitterDescription = computed(() =>
    String(dynamicValue(dynamic.twitterDescription) || "")
  );
  const dynamicTwitterImage = computed(() =>
    String(dynamicValue(dynamic.twitterImage) || "")
  );
  const dynamicOgTypeRaw = computed(() =>
    String(dynamicOgType.value || tf("ogType") || "website").trim()
  );
  const ogTypeRaw = dynamicOgTypeRaw.value;
  const ogTypeNormalized = ogTypeRaw.toLowerCase();
  const ogType =
    ogTypeNormalized === "article" ||
    ogTypeNormalized === "profile" ||
    ogTypeNormalized === "website"
      ? ogTypeNormalized
      : "website";
  const ogImage = dynamicOgImage.value || tf("ogImage");
  const ogImageAlt =
    dynamicOgImageAlt.value || tm("ogImageAlt") || tf("ogTitle");
  const ogImageWidth = String(
    dynamicValue(dynamic.ogImageWidth) || tm("ogImageWidth") || "1200"
  );
  const ogImageHeight = String(
    dynamicValue(dynamic.ogImageHeight) || tm("ogImageHeight") || "630"
  );
  const twitterSite =
    dynamicTwitterSite.value ||
    tm("twitterSite") ||
    String(config.public?.TWITTER_SITE || "@imchatty_news");

  useHead(() => ({
    title: dynamicTitle.value || tf("title"),
    link: [
      { rel: "canonical", href: canonicalHref.value },
      ...hreflangLinks.value,
    ],
    meta: [
      {
        name: "description",
        content: dynamicDescription.value || tf("description"),
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
      { property: "og:locale", content: ogLocale.value },
      ...ogAlternateLocales.value.map((altLocale) => ({
        property: "og:locale:alternate",
        content: altLocale,
      })),
      { property: "og:title", content: dynamicOgTitle.value || tf("ogTitle") },
      {
        property: "og:description",
        content: dynamicOgDescription.value || tf("ogDescription"),
      },
      { property: "og:type", content: ogType },
      { property: "og:url", content: canonicalHref.value },
      { property: "og:image", content: ogImage },
      { property: "og:image:alt", content: ogImageAlt },
      { property: "og:image:width", content: ogImageWidth },
      { property: "og:image:height", content: ogImageHeight },
      {
        name: "twitter:card",
        content: dynamicTwitterCard.value || tf("twitterCard"),
      },
      { name: "twitter:site", content: twitterSite },
      {
        name: "twitter:title",
        content: dynamicTwitterTitle.value || tf("twitterTitle"),
      },
      {
        name: "twitter:description",
        content: dynamicTwitterDescription.value || tf("twitterDescription"),
      },
      {
        name: "twitter:image",
        content: dynamicTwitterImage.value || tf("twitterImage"),
      },
    ],
  }));
}
