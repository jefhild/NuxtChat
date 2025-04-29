<template>
  <v-container>
    <h2 class="text-h5 font-weight-medium mb-4">Popular AI Profiles</h2>

    <ProfileGrid :profiles="aiProfiles" />
  </v-container>
</template>



<script setup>

const aiProfiles = ref([]);
const profileLimit = 5;
const { getMostPopularAiProfiles } = useDb();

// Fetch data during SSR
const data = await getMostPopularAiProfiles(profileLimit);
if (data) {
  aiProfiles.value = data;
  // console.log("aiProfiles", aiProfiles.value);
}

</script>

