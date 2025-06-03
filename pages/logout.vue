<template>
  <v-container fluid class="pa-0">
    <HomeRow1 />
    <LogoutHome />
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
  ogType: "Website",
  ogUrl: "https://imchatty.com/logout",
  ogImage: "https://imchatty.com/images/robot.png",
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
