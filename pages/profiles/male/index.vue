<template>
  <v-container fluid>
    <!-- Back Button -->
    <v-row>
      <v-col cols="12">
        <!-- Page Title -->
        <div class="d-flex justify-center mt-4">
          <v-btn icon @click="$router.back()" color="primary" class="mr-4">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1>Popular Male Profiles</h1>
        </div>
      </v-col>
    </v-row>

    <!-- Content -->
    <HomeMale :limit="100" />
  </v-container>
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const isLoading = ref(false);

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles/male",
    },
  ],
}));

useSeoMeta({
  title: "More Popular Male Profiles",
  description:
    "Check out our most popular male profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogTitle: "Popular Male Profiles",
  ogType: "Website",
  ogUrl: "https://imchatty.com/profiles/male/",
  ogDescription:
    "Check out our most popular male profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogImage: "https://imchatty.com/images/robot.png",
  twitterCard: "summary_large_image",
  twitterTitle: "Popular male Profiles",
  twitterDescription:
    "Check out our most popular male profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
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
