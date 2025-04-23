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
      src: "https://app.termly.io/resource-blocker/ee8afaf4-646e-47a2-8f9f-8be980f483fe?autoBlock=on",
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
