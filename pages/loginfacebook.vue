<template>
  <v-row justify="center" align="center" v-if="isLoading">
    <v-col cols="12" class="text-center">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </v-col>
  </v-row>
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
    await authStore.fetchUserProfileFacebook();

    // If the profile exists, update it with any new data from Facebook
    if (authStore.user && authStore.userProfile) {
      const { email, app_metadata } = authStore.user;
      const provider = app_metadata.provider || "facebook";

      console.log("email: ", email);
      console.log("provider: ", provider);

      await authStore.updateUserProfileAfterLinking({
        email,
        provider,
      });
    }

    // Redirect based on profile completeness
    // if (!authStore.userProfile?.displayname) {
    if (authStore.userProfile) {
      router.push(localPath("/settings")); // Go to onboarding if profile is incomplete
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
