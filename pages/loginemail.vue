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

      <v-row justify="center" align="center" class="mt-4">
        <v-col cols="auto">
          <v-btn color="primary" @click="getChatting">Get Chatting!</v-btn>
        </v-col>
        <v-col cols="auto">
          <v-btn color="primary" @click="goToSettings">Go to my profile!</v-btn>
        </v-col>
      </v-row>
    </v-col> 
  </v-row>

</template>
<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const router = useRouter();
const isLoading = ref(true);
const { authGetSession, authRefreshSession } = useDb();

onMounted(async () => {
  console.log("login onMounted  ");

  //try and refresh the session
  const {data: sessionData} = await authGetSession();

  if (!sessionData.session) {
    await authRefreshSession();
  }
  try {
    await authStore.checkAuthEmail();

    isLoading.value = false;
  } catch (error) {
    console.error("Inside catch error: ", error);
    // router.push("/");
  }
});

const goToSettings = () => {
  router.push("/settings");
};

const getChatting = () =>
{
  router.push("/chat");
};
</script>
