<template>
  <div />
</template>

<script setup>
import { buildFaqTopicPath } from "~/utils/faqPaths";

const route = useRoute();
const localePath = useLocalePath();
const { locale, localeProperties } = useI18n();

const apiLocale = computed(
  () => localeProperties.value?.iso || locale.value || "en-US"
);

const { data: topicResponse } = await useFetch("/api/faq-topic", {
  query: computed(() => ({
    slug: route.params.slug,
    locale: apiLocale.value,
  })),
  default: () => ({ success: false, data: null }),
});

if (!topicResponse.value?.success || !topicResponse.value?.data?.topic) {
  throw createError({ statusCode: 404, statusMessage: "FAQ topic not found" });
}

const topic = topicResponse.value.data.topic;
const path = localePath(buildFaqTopicPath(topic.groupSlug, topic.slug));
const destination = route.hash ? `${path}${route.hash}` : path;

await navigateTo(destination, { redirectCode: 301, replace: true });
</script>
