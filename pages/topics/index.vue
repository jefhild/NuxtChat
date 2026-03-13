<template>
  <SeoPageIndex
    kicker="Topics"
    title="Chat topics"
    description="Browse evergreen search-entry pages around meeting people online, making friends, and conversation-oriented discovery."
    :pages="pages"
  />
</template>

<script setup>
const { locale } = useI18n();

const { data } = await useAsyncData(
  () => `seo-index-topics-${locale.value}`,
  () => $fetch("/api/seo-pages", { query: { type: "topic", locale: locale.value } })
);

const pages = computed(() => data.value?.pages || []);

useSeoI18nMeta("home", {
  dynamic: {
    title: "Meet People Online Topics | ImChatty",
    description: "Explore topic pages around anonymous chat, making friends online, and conversation-based discovery.",
    ogTitle: "Meet People Online Topics | ImChatty",
    ogDescription: "Topic pages that connect broad search intent to the ImChatty product experience.",
  },
});
</script>
