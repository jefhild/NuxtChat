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
      <!-- If the user is authenticated -->
      <template v-if="isAuthenticated">
        <v-col cols="12">
          <v-row>
            <v-col class="green--text-h1 text-center mt-3">
              You're signed in! Enjoy free anonymous chat.</v-col
            >
          </v-row>
          <v-row>
            <v-col class="text-center">
              <v-btn to="/chat" color="purple">Keep Chatting</v-btn>
            </v-col>
          </v-row>
          <NewsContainer />
        </v-col>
      </template>

      <!-- If the user is not authenticated -->
      <template v-else>
        <HomeMain />
        <MoreFemale />
      </template>
    </v-row>

  </v-container>
</template>

<script setup>
useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles/female",
    },
  ],
  title: "Popular Female Profiles",
}));

useSeoMeta({
  title: "More Popular Female Profiles",
  description:
    "Check out our most popular female profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  ogTitle: "Popular Female Profiles",
  ogDescription: "Check out our most popular female profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // ogImage: popularProfiles[0].value.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Female Profiles",
  twitterDescription: "Check out our most popular female profiles! Browse top-rated members with real profiles, personalized details, and genuine interests.",
  // twitterImage: popularProfiles[0].value.avatar_url,
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
