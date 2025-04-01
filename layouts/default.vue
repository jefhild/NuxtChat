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
