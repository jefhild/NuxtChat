<template>
  <v-row justify="center" align="center" v-if="isLoading">
    <v-col cols="12" class="text-center">
      <v-progress-circular indeterminate color="primary"></v-progress-circular>
    </v-col>
  </v-row>

  <v-row justify="center" align="center" v-else>
    <v-col cols="12" class="text-center">
      <h1>Welcome, Thanks for verifying your email</h1>
      <h2>You can finish setting up your profile or connect to your account now.</h2>
      <!-- <p>{{ authStore.userProfile.value.ip }}</p> -->
      <v-btn color="primary" @click="goToSettings" class="mb-4 mt-4">Get Chatting!</v-btn>
    </v-col>
  </v-row>
</template>
<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);

onMounted(async () => {
  console.log("login onMounted  ");

  try {
    // await authStore.fetchUserProfileGoogle();
    await authStore.checkAuthEmail();
    console.log("authStore.user: ", authStore.user);
    console.log("authStore.userProfile: ", authStore.userProfile);
    isLoading.value = false;
  } catch (error) {
    console.error("Inside catch error: ", error);
    router.push("/");
  }
});

const goToSettings = () => {
  router.push("/settings");
};
</script>
