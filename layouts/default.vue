<template>
  <v-layout class="fill-height">
    <ClientOnly>
      <NavBar />
    </ClientOnly>
    <v-main class="d-flex flex-column">
      <slot />
      <Footer />
    </v-main>
  </v-layout>
</template>
<script setup>
import { useAuthStore } from '@/stores/authStore';
import { usePresenceChannel } from '@/composables/usePresenceChannel';

const authStore = useAuthStore();
useHead({
  script: [
    {
      src: "https://app.termly.io/resource-blocker/e30952b7-b801-4ffb-b6b8-733d8d45d0b3?autoBlock=on",
      type: "text/javascript",
      async: true
    }
  ]
});

watch(
  () => authStore.user?.id,
  (userId) =>
  {
    if (userId)
    {
      usePresenceChannel(userId); // 🔥 track presence!
    }
  },
  { immediate: true }
);
</script>


<style scoped>
.fill-height {
  min-height: 100vh;
}
</style>
