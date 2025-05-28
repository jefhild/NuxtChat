<template>
    <v-container fluid>
      <HomeRow1 />
      <!-- <v-row justify="center" class="mt-4">
        <v-col cols="auto">
          <LoginAi :titleText="titleText" />
        </v-col>
      </v-row> -->
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
