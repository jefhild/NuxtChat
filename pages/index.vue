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
  ogType: "Website",
  ogUrl: "https://imchatty.com/",
  ogDescription:
    "ImChatty is a unique platform for anonymous chatting with real users or AI. Explore our mission, vision, and values.",
  ogImage: "https://imchatty.com/images/robot.png",
  twitterTitle: "Popular Free Chat",
  twitterCard: "summary_large_image",
});
</script>
