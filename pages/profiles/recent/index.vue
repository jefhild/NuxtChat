<template>
  <div class="d-flex justify-center mt-4">
    <h1>Popular Recent Profiles</h1>
  </div>
  <HomeRecent :limit="100" />
</template>

<script setup>
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const isLoading = ref(false);

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/recent",
    },
  ],
}));

useSeoMeta({
  title: "More Popular Recent Profiles",
  description:
    "Check out our most popular recent profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogTitle: "Popular Profiles",
  ogDescription:
    "Check out our most popular recent profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // ogImage: popularProfiles[0].value.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Recent Profiles",
  twitterDescription:
    "Check out our most popular recent profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // twitterImage: popularProfiles[0].value.avatar_url,
});


onMounted(async () =>
{
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
