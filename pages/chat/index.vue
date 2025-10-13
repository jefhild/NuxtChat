<template>
  <v-container fluid class="d-flex flex-column h-100 min-h-0">
    <HomeRow1 />
    <LoadingContainer
      v-if="isLoading"
      :text="$t('components.loadingContainer.loading')"
    />
    <ChatLayout
    class="flex-grow-1 min-h-0"
      v-else
      :user="authStore.user"
      :userProfile="authStore.userProfile"
      :authStatus="authStore.authStatus"
    />
  </v-container>
</template>




<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { onMounted, ref } from "vue";

const authStore = useAuthStore();
const isLoading = ref(true);

onMounted(async () => {
  try {
    // console.log("[chat2] onMounted: checking auth...");
    await authStore.checkAuth(); // safe getSession-based check
  } catch (e) {
    console.warn("[auth] checkAuth failed (ok to continue):", e);
  } finally {
    isLoading.value = false;
  }
});
</script>
