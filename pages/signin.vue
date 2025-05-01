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

useSeoMeta({
  title: "Sign In – Access Your ImChatty Account",
  description:
    "Securely sign in to your ImChatty account using Google, Facebook, or email. Join conversations with real people or AI chat partners in seconds.",
  ogTitle: "Sign In to ImChatty",
  ogDescription:
    "Login securely via Google, Facebook, or email and start chatting anonymously with real or AI users. Your chat journey begins here.",
  ogImage: "https://imchatty.com/images/article-image.webp",
  twitterCard: "summary_large_image",
  twitterTitle: "Sign In – Chat Anonymously with ImChatty",
  twitterDescription:
    "Easily access your ImChatty account with Google, Facebook, or email login. Start anonymous conversations with real or AI profiles today.",
  twitterImage: "https://imchatty.com/images/article-image.webp"
});
</script>
