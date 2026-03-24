import { getMarketingPage } from "@/utils/marketingPages";

const LANDING_PAGE_TYPES: Record<string, "landing"> = {
  "anonymous-chat": "landing",
  "chat-without-signup": "landing",
  "mood-based-chat": "landing",
  "meet-new-people-online": "landing",
};

export function useLandingSeoPage(slug: string) {
  const { locale } = useI18n();
  const pageType = LANDING_PAGE_TYPES[String(slug || "").trim().toLowerCase()] || "landing";

  const fallbackPage = computed(() => getMarketingPage(slug, locale.value));

  const { data } = useAsyncData(
    () => `seo-page-landing-${slug}-${locale.value}`,
    async () => {
      try {
        return await $fetch(`/api/seo-pages/${pageType}/${slug}`, {
          query: { locale: locale.value },
        });
      } catch (error) {
        console.error("[landing-page] admin fetch failed", {
          slug,
          locale: locale.value,
          error,
        });
        return null;
      }
    }
  );

  const adminPage = computed(() => data.value?.page || null);
  const page = computed(() =>
    adminPage.value
      ? {
          ...adminPage.value,
          sectionLabel: "Landing",
        }
      : fallbackPage.value
  );
  const availableLocales = computed(() =>
    (adminPage.value ? data.value?.availableLocales || ["en"] : ["en"]).map(
      (localeCode: string) =>
        String(localeCode || "").split("-")[0].trim().toLowerCase()
    )
  );
  const baseLocale = computed(() =>
    String(locale.value || "en").split("-")[0].trim().toLowerCase()
  );
  const resolvedPageLocale = computed(() =>
    String(page.value?.locale || "en").split("-")[0].trim().toLowerCase()
  );
  const canonicalLocale = computed(() => {
    if (availableLocales.value.includes(baseLocale.value)) return baseLocale.value;
    if (availableLocales.value.includes("en")) return "en";
    return availableLocales.value[0] || "en";
  });
  const robots = computed(() =>
    resolvedPageLocale.value !== baseLocale.value
      ? "noindex,follow"
      : undefined
  );
  useSeoI18nMeta("home", {
    canonicalLocaleCode: canonicalLocale,
    availableLocaleCodes: availableLocales,
    robots,
    dynamic: {
      title: computed(() => page.value?.metaTitle || page.value?.title || "ImChatty"),
      description: computed(() => page.value?.metaDescription || page.value?.subtitle || ""),
      ogTitle: computed(() => page.value?.metaTitle || page.value?.title || "ImChatty"),
      ogDescription: computed(() => page.value?.metaDescription || page.value?.subtitle || ""),
      ogImage: computed(() => page.value?.heroImageUrl || ""),
      ogImageAlt: computed(() => page.value?.heroTitle || page.value?.title || "ImChatty"),
      ogType: "website",
      twitterCard: "summary_large_image",
      twitterTitle: computed(() => page.value?.metaTitle || page.value?.title || "ImChatty"),
      twitterDescription: computed(
        () => page.value?.metaDescription || page.value?.subtitle || ""
      ),
      twitterImage: computed(() => page.value?.heroImageUrl || ""),
    },
  });

  return {
    locale,
    page,
    availableLocales,
  };
}
