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

onMounted(async () => {
  try {
    // Only attempt auth session on client
    const { data: user } = await authGetUser();

    if (user?.user) {
      await authStore.checkAuth(); // updates state
      router.replace("/"); // clean redirect
    } else {
      console.warn("No session found — redirecting to login");
      router.replace("/login");
    }
  } catch (err) {
    console.error("Auth callback error:", err);
    router.replace("/login");
  }
});
</script>

<style scoped>
/* Optional: center spinner */
</style>