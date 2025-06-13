<template>
  <!-- Remove margin by forcing pa-0 on the wrapper -->
  <v-container fluid class="pa-0">
    <HomeRow1 />
    <LandingPage />
  </v-container>
</template>

<script setup>
useSeoI18nMeta("home");
// import LandingPage from "~/components/LandingPage.vue";
// import { useI18n } from "vue-i18n";
// import { computed } from "vue";

// const { t } = useI18n();

// const seoTitle = computed(() => t("pages.home.meta.title"));
// const seoDescription = computed(() => t("pages.home.meta.description"));
// const ogTitle = computed(() => t("pages.home.meta.ogTitle"));
// const twitterTitle = computed(() => t("pages.home.meta.twitterTitle"));
// const twitterCard = computed(() => t("pages.home.meta.twitterCard"));

// // SSR-safe SEO meta
// useSeoMeta({
//   title: () => seoTitle.value,
//   description: () => seoDescription.value,
//   ogTitle: () => ogTitle.value,
//   twitterTitle: () => twitterTitle.value,
//   twitterCard: () => twitterCard.value,
// });
</script>
