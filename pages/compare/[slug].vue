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
const config = useRuntimeConfig();

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
const canonicalLocale = computed(() => {
  if (availableLocales.value.includes(baseLocale.value)) return baseLocale.value;
  if (availableLocales.value.includes("en")) return "en";
  return availableLocales.value[0] || "en";
});
const canonicalPath = computed(
  () => switchLocalePath(canonicalLocale.value) || route.path || "/"
);
const baseUrl = String(config.public.SITE_URL || "").replace(/\/+$/, "");

useSeoI18nMeta("home", {
  canonicalLocaleCode: canonicalLocale.value,
  availableLocaleCodes: availableLocales,
  overrideUrl: `${baseUrl}${canonicalPath.value === "/" ? "" : canonicalPath.value}`,
  dynamic: {
    title: page.value?.metaTitle || page.value?.title,
    description: page.value?.metaDescription || page.value?.subtitle || "",
    ogTitle: page.value?.metaTitle || page.value?.title,
    ogDescription: page.value?.metaDescription || page.value?.subtitle || "",
    ogImage: page.value?.heroImageUrl || undefined,
    twitterImage: page.value?.heroImageUrl || undefined,
  },
});
</script>
