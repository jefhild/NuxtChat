<template>
  <v-layout class="d-flex flex-column" style="min-height: 100vh">
    <ClientOnly>
      <NavBar />
    </ClientOnly>

    <v-main class="d-flex flex-column flex-grow-1">
      <v-container fluid class="d-flex flex-column flex-grow-1 pa-0">
        <div class="d-flex flex-column flex-grow-1">
          <NuxtPage />
          <!-- This is where the page is rendered -->
        </div>
        <Footer />
      </v-container>
    </v-main>
  </v-layout>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { usePresenceChannel } from "@/composables/usePresenceChannel";

const authStore = useAuthStore();
useHead({
  script: [
    {
      src: "https://app.termly.io/resource-blocker/e30952b7-b801-4ffb-b6b8-733d8d45d0b3?autoBlock=on",
      type: "text/javascript",
      async: true,
    },
  ],
});



watch(
  () => authStore.user?.id,
  (userId) => {
    if (userId) {
      usePresenceChannel(userId); // 🔥 track presence!
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
