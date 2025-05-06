<template>
  <v-container>
    <h2 class="text-h5 font-weight-light mb-4">Recent Profiles</h2>
    <ProfileGrid :profiles="recentProfiles" />
  </v-container>
</template>

<script setup>
const recentProfiles = ref([]);
const profileLimit = 30;
const { getRecentProfiles } = useDb();

// Fetch data during SSR
const data = await getRecentProfiles(profileLimit);

if (data) {
  recentProfiles.value = data;
}

</script>
