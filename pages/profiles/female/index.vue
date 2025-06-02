<template v-if="!isLoading">
  <v-container fluid>
    <!-- Back Button -->
    <v-row>
      <v-col cols="12">
        <!-- Page Title -->
        <div class="d-flex justify-center mt-4">
          <v-btn icon @click="$router.back()" color="primary" class="mr-4">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1>Popular Female Profiles</h1>
        </div>
      </v-col>
    </v-row>

    <!-- Content -->
    <HomeFemale :limit="100" />
  </v-container>
</template>

<script setup>
const isLoading = ref(false);
const isAuthenticated = ref(false);
const authStore = useAuthStore();

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles/female",
    },
  ],
}));

useSeoMeta({
  title: "More Popular Female Profiles",
  description:
    "Check out our most popular female profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogTitle: "Popular Female Profiles",
  ogType: "Website",
  ogUrl: "https://imchatty.com/profiles/female/",
  ogDescription:
    "Check out our most popular female profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogImage: "https://imchatty.com/images/robot.png",
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Female Profiles",
  twitterDescription:
    "Check out our most popular female profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // twitterImage: popularProfiles[0].value.avatar_url,
});

onMounted(async () => {
  isLoading.value = true;
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  isLoading.value = false;
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
