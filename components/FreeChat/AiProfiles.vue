<template>
  <v-container>
    <h2 class="text-h5 font-weight-light mb-2">Popular AI Profiles</h2>
    <ProfileGrid :profiles="aiProfiles" :limit="4" />
  </v-container>
</template>

<script setup>
const aiProfiles = ref([]);
const profileLimit = 8;
const { getMostPopularAiProfiles } = useDb();

// Fetch data during SSR
const data = await getMostPopularAiProfiles(profileLimit);
if (data) {
  aiProfiles.value = data;
  // console.log("aiProfiles", aiProfiles.value);
}
</script>
