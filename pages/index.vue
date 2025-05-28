<template>
  <!-- Remove margin by forcing pa-0 on the wrapper -->
  <v-container fluid class="pa-0">
    <HomeRow1 />
    <LandingPage />
  </v-container>
</template>

<script setup>
import LandingPage from "~/components/LandingPage.vue";

// SSR-safe head meta
useSeoMeta({
  title: "Free Anonymous Chat (Real or AI)",
  description: "Explore real & AI chat profiles on imchatty.com",
  ogTitle: "Real & AI Chat Profiles",
  twitterTitle: "Popular Free Chat",
  twitterCard: "summary_large_image",
});
</script>
