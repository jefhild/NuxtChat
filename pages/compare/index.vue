<template>
  <SeoPageIndex
    kicker="Compare"
    title="Chat comparisons"
    description="Browse comparison pages aimed at users looking for alternatives, tradeoffs, and best-fit chat options."
    :pages="pages"
  />
</template>

<script setup>
const { locale } = useI18n();

const { data } = await useAsyncData(
  () => `seo-index-compare-${locale.value}`,
  () => $fetch("/api/seo-pages", { query: { type: "compare", locale: locale.value } })
);

const pages = computed(() => data.value?.pages || []);

useSeoI18nMeta("home", {
  dynamic: {
    title: "Compare Anonymous Chat Options | ImChatty",
    description: "Comparison pages for anonymous chat, text-first chat, and alternatives users search for before joining.",
    ogTitle: "Compare Anonymous Chat Options | ImChatty",
    ogDescription: "Browse search-focused comparison pages and jump into chat when you're ready.",
  },
});
</script>
