<template>
  <!-- Loading Spinner -->
  <v-container v-if="isLoading" class="d-flex align-center justify-center fill-height">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </v-container>

  <!-- Sign-in screen -->
  <v-container fluid v-else-if="!isAuthenticated" class="d-flex flex-column align-center justify-center fill-height">
    <div class="w-100">
      <HomeRow1 />
    </div>
    <v-row justify="center" align="center">
      <v-col cols="auto">
        <HomeMain />
      </v-col>
    </v-row>
  </v-container>

  <!-- Redirect fallback (shouldn't be seen, but just in case) -->
  <v-container v-else>
    <div>hi, you should never be here...</div>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
const router = useRouter();
// Track the current step
const authStore = useAuthStore();
const isAuthenticated = ref(false);
const isLoading = ref(false);
isLoading.value = true; // Set loading to true initially

onMounted(async () =>
{
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  isLoading.value = false;

  if (isAuthenticated.value)
  {
    router.push("/");
    return;
  }
});
</script>
