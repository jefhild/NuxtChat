<template>
  <v-container fluid>
    <HomeRow1 />

    <!-- Display the loading spinner if the page is loading -->
    <v-row justify="center" align="center" v-if="isLoading">
      <v-col cols="12" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </v-col>
    </v-row>

    <!-- Conditional rendering based on authentication status -->
    <v-row v-else>
      <!-- If the user is authenticated, show ChatContainer5 -->
      <template v-if="isAuthenticated">
        <v-col cols="12">
          <ChatContainer />
        </v-col>
      </template>

      <!-- <template v-else>
        <HomeMain />
        <NewsContainer />
      </template> -->
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
  const { data: userProfileData } = await getUserProfileFromId(authStore.user?.id);

  if (!userProfileData)
  {
    isAuthenticated.value = false; // User doesn't exist, set to false
    router.push(localPath("/")); // Redirect to home page
    return;
  }
  isLoading.value = false;
});
</script>

<style scoped></style>
