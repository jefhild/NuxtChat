<template>
  <v-container fluid>
    <HomeRow1 />

    <!-- Display the loading spinner if the page is loading -->
    <LoadingContainer v-if="isLoading" :text="$t('components.loadingContainer.loading')" />

    <!-- Conditional rendering based on authentication status -->
    <v-row v-else>
      <v-col v-if="isAuthenticated" cols="12">
        <ChatContainer />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const isAuthenticated = ref(false);
const isLoading = ref(true);
const router = useRouter();
const localPath = useLocalePath();

const { getUserProfileFromId } = useDb();

onMounted(async () => {
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  const { data: userProfileData } = await getUserProfileFromId(
    authStore.user?.id
  );

  if (!userProfileData) {
    isAuthenticated.value = false; // User doesn't exist, set to false
    router.push(localPath("/")); // Redirect to home page
    return;
  }
  isLoading.value = false;
});
</script>

<style scoped></style>
