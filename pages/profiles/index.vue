<template>
  <v-container fluid>
    <HomeRow1 />
    <v-row>
      <v-col cols="12">
        <NewsContainer />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles",
    },
  ],
}));

useSeoMeta({
  title: "More Popular Profiles",
  description:
    "Check out our most popular  profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogTitle: "Popular Profiles",
  ogType: "Website",
  ogUrl: "https://imchatty.com/profiles/",
  ogDescription:
    "Check out our most popular  profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogImage: "https://imchatty.com/images/robot.png",
  twitterCard: "summary_large_image",
  twitterTitle: "Popular  Profiles",
  twitterDescription:
    "Check out our most popular profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // twitterImage: popularProfiles[0].value.avatar_url,
});

onMounted(async () => {
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
});
</script>
