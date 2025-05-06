<template>
  <v-container>
    <h2 class="text-h5 font-weight-light mb-4">Popular Real Profiles</h2>
    <ProfileGrid :profiles="popularProfiles" />
  </v-container>
</template>

<script setup>
const popularProfiles = ref([]);
const profileLimit = 30;
const { getMostPopularProfiles } = useDb();

// Fetch data during SSR
const data = await getMostPopularProfiles(profileLimit);

if (data) {
  popularProfiles.value = data;
  // console.log("popularProfiles", popularProfiles.value);
}

// // Function to format the 'created' column
// const formatCreated = (created) => {
//   const date = new Date(created);
//   return date.toISOString().split("T")[0]; // Formats the date as "YYYY-MM-DDTHH:mm:ss.sssZ"
// };
</script>
