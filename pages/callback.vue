<template>
  <v-container class="d-flex align-center justify-center fill-height">
    <v-progress-circular indeterminate color="primary" size="50" />
  </v-container>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useDb } from "@/composables/useDB";

const router = useRouter();
const authStore = useAuthStore();
const { authGetUser } = useDb();
const localPath = useLocalePath();

onMounted(async () => {
  try {
    // Only attempt auth session on client
    const { data: user } = await authGetUser();

    if (user?.user) {
      await authStore.checkAuth(); // updates state
      router.replace(localPath("/")); // clean redirect
    } else {
      console.warn("No session found — redirecting to login");
      router.replace(localPath("/login"));
    }
  } catch (err) {
    console.error("Auth callback error:", err);
    router.replace(localPath("/login"));
  }
});
</script>

<style scoped>
/* Optional: center spinner */
</style>