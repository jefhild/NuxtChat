<template>
  <SeoLandingPage
    v-if="page"
    :page="page"
    section-label="Landing"
    :available-locales="availableLocales"
    :current-locale="locale"
  />
</template>

<script setup lang="ts">
const route = useRoute();
const { locale } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const { data, error } = await useAsyncData(
  () => `seo-page-landing-${route.params.slug}-${locale.value}`,
  () =>
    $fetch(`/api/seo-pages/landing/${route.params.slug}`, {
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
const robots = computed(() =>
  resolvedPageLocale.value !== baseLocale.value ? "noindex,follow" : undefined
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
</script>
