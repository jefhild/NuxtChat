<template>
  <v-container fluid>
    <v-row>
      <v-col cols="12">
        <HomeRow1 />
      </v-col>
    </v-row>

    <v-row class="mt-16" justify="center">
      <v-col cols="11" md="8" lg="8">
        <LogoutAI />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/logout",
    },
  ],
}));

useSeoMeta({
  title: "Logout",
  description: "Free anonymous chat app (Real or AI) for everyone.",
  ogTitle: "Imchatty - Logout",
  ogDescription: "Free anonymous chat app (Real or AI) for everyone.",
  // ogImage: "",
  twitterCard: "summary_large_image",
  twitterTitle: "Imchatty - Logout",
  twitterDescription: "Free anonymous chat app (Real or AI) for everyone.",
  // twitterImage: "",
});

onMounted(async () => {
  // console.log("logout");
  await authStore.logout();
});
</script>

<style scoped>
.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.imchattyLogo {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: rgb(80, 51, 90);
}
</style>
