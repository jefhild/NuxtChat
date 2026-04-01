<template>
  <v-container fluid>
    <PageHeader
      :text="$t('pages.about.heading')"
      :subtitle="$t('pages.about.subtitle')"
    />
    <v-tabs v-model="tab" color="primary" :mobile="false" mobile-breakpoint="0">
      <v-tab :value="1">
        {{ $t("pages.about.tabs.humans") }}
      </v-tab>
      <v-tab :value="2">
        {{ $t("pages.about.tabs.newsroom") }}
      </v-tab>
      <v-tab :value="3">
        {{ $t("pages.about.tabs.faq") }}
      </v-tab>
    </v-tabs>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item :value="1">
        <About />
      </v-tabs-window-item>
      <v-tabs-window-item :value="2">
        <AiProfiles />
      </v-tabs-window-item>
      <v-tabs-window-item :value="3">
        <AboutFaq />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>
<script setup>
import AboutFaq from "~/components/AboutFaq.vue";

const tab = ref(1);
const route = useRoute();
const { t } = useI18n();

useSeoI18nMeta('about');

useHead(() => ({
  script: [{
    key: 'ld-about-page',
    type: 'application/ld+json',
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": t('pages.about.meta.title'),
      "description": t('pages.about.meta.description'),
      "url": "https://imchatty.com/about",
      "isPartOf": { "@id": "https://imchatty.com/#website" },
      "publisher": { "@id": "https://imchatty.com/#organization" },
    }),
  }],
}));

watch(
  () => route.hash,
  (hash) => {
    if (hash) {
      tab.value = 3;
    }
  },
  { immediate: true }
);
</script>
