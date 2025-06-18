<template>
  <LoadingContainer v-if="isLoading" />
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);
const localPath = useLocalePath();

onMounted(async () => {
  try {
    // Fetch the current user profile
    await authStore.fetchUserProfileGoogle();

    // If the profile exists, update it with any new data from Google
    if (authStore.user && authStore.userProfile) {
      const { email, app_metadata } = authStore.user;
      const provider = app_metadata.provider || "google";

      await authStore.updateUserProfileAfterLinking({
        email,
        provider,
      });
    }

    // Redirect based on profile completeness
    // if (!authStore.userProfile?.displayname) {
    if (authStore.userProfile) {
      // router.push(localPath("/settings")); // Go to onboarding if profile is incomplete
      router.push(localPath("/chat"));
    } else {
      router.push(localPath("/")); // Go to home if profile is complete
    }
  } catch (error) {
    console.error("Error during login process:", error);
    router.push(localPath("/")); // Fallback in case of an error
  } finally {
    isLoading.value = false; // Stop the loading spinner
  }
});
</script>
