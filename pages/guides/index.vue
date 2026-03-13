<template>
  <SeoPageIndex
    kicker="Guides"
    title="Chat guides"
    description="Browse evergreen guides covering anonymous chat, safety, and how users can get the most from ImChatty."
    :pages="pages"
  />
</template>

<script setup>
const { locale } = useI18n();

const { data } = await useAsyncData(
  () => `seo-index-guides-${locale.value}`,
  () => $fetch("/api/seo-pages", { query: { type: "guide", locale: locale.value } })
);

const pages = computed(() => data.value?.pages || []);

useSeoI18nMeta("home", {
  dynamic: {
    title: "Anonymous Chat Guides | ImChatty",
    description: "Explore practical guides about anonymous chat, privacy, and getting started on ImChatty.",
    ogTitle: "Anonymous Chat Guides | ImChatty",
    ogDescription: "Evergreen guides that explain the chat experience and answer common questions.",
  },
});
</script>
