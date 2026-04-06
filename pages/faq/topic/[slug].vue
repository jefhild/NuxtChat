<template>
  <v-container fluid>
    <v-breadcrumbs :items="breadcrumbs" class="pa-0 mb-2 text-body-2">
      <template #divider>
        <v-icon size="x-small" icon="mdi-chevron-right" />
      </template>
    </v-breadcrumbs>

    <PageHeader
      :text="topicTitle"
      :subtitle="$t('pages.faq.topic.subtitle', { group: groupTitle })"
    >
      <template #icon>
        <v-icon icon="mdi-help-circle-outline" />
      </template>
    </PageHeader>

    <v-row class="mt-2">
      <v-col cols="12" md="8" offset-md="2">
        <v-card elevation="0" class="faq-topic-card pa-3 pa-md-4">
          <v-skeleton-loader v-if="pending" type="list-item@4" class="pa-2" />
          <div
            v-else-if="!entries.length"
            class="text-body-2 text-medium-emphasis pa-4"
          >
            {{ $t("pages.faq.topic.empty") }}
          </div>
          <v-expansion-panels
            v-else
            v-model="expanded"
            variant="accordion"
            class="faq-topic-panels"
          >
            <v-expansion-panel
              v-for="faq in entries"
              :id="faq.slug || faq.id"
              :key="faq.id"
              :value="faq.slug || faq.id"
              class="faq-panel"
            >
              <v-expansion-panel-title>
                <h3 class="font-weight-medium faq-question-heading">
                  {{ faq.question }}
                </h3>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <p class="text-body-2 mb-0">{{ faq.answer }}</p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>

        <div class="mt-4">
          <v-btn
            variant="text"
            :to="localePath('/faq')"
            prepend-icon="mdi-arrow-left"
            size="small"
          >
            {{ $t("pages.faq.topic.back-link") }}
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const route = useRoute();
const localePath = useLocalePath();
const { t, locale, localeProperties } = useI18n();
const config = useRuntimeConfig();

const apiLocale = computed(
  () => localeProperties.value?.iso || locale.value || "en-US"
);

const { data: topicResponse, pending } = await useFetch("/api/faq-topic", {
  query: computed(() => ({
    slug: route.params.slug,
    locale: apiLocale.value,
  })),
  default: () => ({ success: false, data: null }),
  watch: [apiLocale],
});

if (
  import.meta.server &&
  topicResponse.value &&
  !topicResponse.value.success
) {
  throw createError({ statusCode: 404, statusMessage: "FAQ topic not found" });
}

const topicData = computed(() => topicResponse.value?.data);
const topicTitle = computed(
  () => topicData.value?.topic?.title || String(route.params.slug)
);
const groupTitle = computed(() => topicData.value?.topic?.groupTitle || "");
const entries = computed(() => topicData.value?.entries || []);

const expanded = ref(null);

watch(
  () => entries.value,
  (list) => {
    if (list.length && !expanded.value && !route.hash) {
      expanded.value = list[0].slug || list[0].id;
    }
  },
  { immediate: true }
);

const breadcrumbs = computed(() => [
  {
    title: t("pages.faq.topic.breadcrumb-home"),
    to: localePath("/"),
    disabled: false,
  },
  { title: "FAQ", to: localePath("/faq"), disabled: false },
  { title: topicTitle.value, disabled: true },
]);

const siteUrl = String(
  config.public?.SITE_URL || "https://imchatty.com"
).replace(/\/+$/, "");

useSeoI18nMeta("faq.topic", {
  dynamic: {
    title: computed(() =>
      topicTitle.value
        ? `${topicTitle.value} — ImChatty FAQ`
        : t("pages.faq.topic.meta.title")
    ),
    description: computed(() => {
      if (!entries.value.length) return t("pages.faq.topic.meta.description");
      const firstAnswer = entries.value[0]?.answer || "";
      const preview =
        firstAnswer.length > 130
          ? firstAnswer.slice(0, 127) + "…"
          : firstAnswer;
      return `${topicTitle.value}: ${preview}`;
    }),
    ogTitle: computed(() =>
      topicTitle.value ? `${topicTitle.value} — ImChatty FAQ` : ""
    ),
    ogDescription: computed(() => {
      if (!entries.value.length) return "";
      const count = entries.value.length;
      return `Browse ${count} question${count !== 1 ? "s" : ""} about ${topicTitle.value} on ImChatty.`;
    }),
  },
});

useHead(() => {
  if (!entries.value.length) return {};

  return {
    script: [
      {
        type: "application/ld+json",
        key: "faq-topic-page-schema",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: entries.value.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }),
      },
      {
        type: "application/ld+json",
        key: "faq-topic-breadcrumb-schema",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: t("pages.faq.topic.breadcrumb-home"),
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "FAQ",
              item: `${siteUrl}/faq`,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: topicTitle.value,
              item: `${siteUrl}/faq/topic/${route.params.slug}`,
            },
          ],
        }),
      },
    ],
  };
});
</script>

<style scoped>
.faq-topic-card {
  border-radius: 16px;
  border: 1px solid rgba(99, 109, 129, 0.2);
}

.faq-question-heading {
  margin: 0;
  font-size: inherit;
  line-height: inherit;
}

.faq-panel :deep(.v-expansion-panel-title) {
  padding: 12px 16px;
}

.faq-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 16px 16px;
}
</style>
