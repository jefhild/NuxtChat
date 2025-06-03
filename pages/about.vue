<template>
  <v-container fluid>
    <HomeRow1 />
    <About />
  </v-container>
</template>
<script setup>
import { useI18n } from "vue-i18n";
import { computed } from "vue";

const { t } = useI18n();

const seoTitle = computed(() => t("pages.about.meta.title"));
const seoDescription = computed(() => t("pages.about.meta.description"));
const ogTitle = computed(() => t("pages.about.meta.ogTitle"));
const ogType = computed(() => t("pages.about.meta.ogType"));
const ogUrl = computed(() => t("pages.about.meta.ogUrl"));
const ogDescription = computed(() => t("pages.about.meta.ogDescription"));
const ogImage = computed(() => t("pages.about.meta.ogImage"));
const twitterTitle = computed(() => t("pages.about.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.about.meta.twitterCard"));
const twitterDescription = computed(() => t("pages.about.meta.twitterDescription"));
const twitterImage = computed(() => t("pages.about.meta.twitterImage"));

// Canonical link
useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com" + "/about",
    },
  ],
}));

// SSR-safe dynamic meta
useSeoMeta({
  title: seoTitle,
  description: seoDescription,
  ogTitle: ogTitle,
  ogType: ogType,
  ogUrl: ogUrl,
  ogDescription: ogDescription,
  ogImage: ogImage,
  twitterCard: twitterCard,
  twitterTitle: twitterTitle,
  twitterDescription: twitterDescription,
  twitterImage: twitterImage,
});
</script>
