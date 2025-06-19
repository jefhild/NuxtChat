<template>
  <v-layout class="d-flex flex-column" style="min-height: 100vh">
    <ClientOnly>
      <NavBar />
    </ClientOnly>

    <v-main class="d-flex flex-column flex-grow-1">
      <v-container fluid class="d-flex flex-column flex-grow-1 pa-0">
        <div class="d-flex flex-column flex-grow-1">
          <NuxtPage />
        </div>
        <Footer />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { usePresenceChannel } from "@/composables/usePresenceChannel";
import { useFavorites } from "@/composables/useFavorites";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const config = useRuntimeConfig();
const authStore = useAuthStore();

// useHead({
//   script: [
//     {
//       src: "https://app.termly.io/resource-blocker/e30952b7-b801-4ffb-b6b8-733d8d45d0b3?autoBlock=on",
//       type: "text/javascript",
//       async: true,
//     },
//     {
//       src: "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7753517892076802",
//       type: "text/javascript",
//       crossorigin: "anonymous",
//       async: true,
//     },
//   ],
//   htmlAttrs: { lang: "en" },
// });


useHead({
  script: [
  {
      src: `https://app.termly.io/resource-blocker/${config.public.TERMLY_ID}?autoBlock=on`,
      type: "text/javascript",
      async: true,
    },
    // {
    //   src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.public.ADSENSE_CLIENT}`,
    //   type: "text/javascript",
    //   crossorigin: "anonymous",
    //   async: true,
    // },
  ],
  htmlAttrs: { lang: "en" },
});


watch(
  () => authStore.user?.id,
  async (userId) => {
    if (userId) {
      // I do this here because i don't want to fetch the favorites every time someone joins in the presence channel
      const { favoriteProfiles, fetchFavorites } = useFavorites(userId);
      await fetchFavorites(); // wait for favorites to load
      // console.log("Joining presence channel for user ID:", userId, favoriteProfiles.value);
      usePresenceChannel(userId, favoriteProfiles, t); // track the presence
    }
  },
  { immediate: true }
);
</script>

<style>
/* No scoped — make sure this applies globally */
/* html, body, #__nuxt, #__layout, .v-application {
  height: 100%;
  margin: 0;
} */
</style>
