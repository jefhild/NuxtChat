<template>
  <v-container fluid>
    <PageHeader
      :text="$t('pages.faq.heading')"
      :subtitle="$t('pages.faq.subtitle')"
    >
      <template #icon>
        <ClientOnly>
          <v-tooltip
            :text="$t('pages.faq.tooltip')"
            location="bottom"
            :scrim="false"
            :open-on-click="false"
          >
            <template #activator="{ props }">
              <v-icon v-bind="props" icon="mdi-help-circle-outline" />
            </template>
          </v-tooltip>
          <template #fallback>
            <v-icon icon="mdi-help-circle-outline" />
          </template>
        </ClientOnly>
      </template>
    </PageHeader>
    <AboutFaq />
  </v-container>
</template>

<script setup>
import AboutFaq from "~/components/AboutFaq.vue";

useSeoI18nMeta("faq");

const { locale } = useI18n();

const { data: faqResponse } = await useFetch("/api/faqs", {
  query: computed(() => ({ locale: locale.value })),
  default: () => ({ success: true, data: { groups: [], entries: [] } }),
});

const faqEntries = computed(() => faqResponse.value?.data?.entries || []);

useHead(() => {
  if (!faqEntries.value.length) return {};
  return {
    script: [
      {
        type: "application/ld+json",
        key: "faq-schema",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqEntries.value.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }),
      },
    ],
  };
});
</script>
