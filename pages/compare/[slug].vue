<template>
  <SeoLandingPage
    v-if="page"
    :page="page"
    section-label="Comparison"
    :available-locales="availableLocales"
    :current-locale="locale"
  />
</template>

<script setup>
const route = useRoute();
const { locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const { data, error } = await useAsyncData(
  () => `seo-page-compare-${route.params.slug}-${locale.value}`,
  () =>
    $fetch(`/api/seo-pages/compare/${route.params.slug}`, {
      query: { locale: locale.value },
    })
);

if (error.value || !data.value?.page) {
  throw createError({ statusCode: 404, statusMessage: "Page not found" });
}

const page = computed(() => data.value?.page || null);
const availableLocales = computed(() => data.value?.availableLocales || ["en"]);
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
const canonicalPath = computed(
  () => switchLocalePath(canonicalLocale.value) || route.path || "/"
);
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
    title: computed(() => page.value?.metaTitle || page.value?.title || ""),
    description: computed(() => page.value?.metaDescription || page.value?.subtitle || ""),
    ogTitle: computed(() => page.value?.metaTitle || page.value?.title || ""),
    ogDescription: computed(() => page.value?.metaDescription || page.value?.subtitle || ""),
    ogImage: computed(() => page.value?.heroImageUrl || ""),
    twitterImage: computed(() => page.value?.heroImageUrl || ""),
  },
});
</script>
