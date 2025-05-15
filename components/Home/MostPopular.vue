<template>
  <v-row v-if="isLoading" justify="center" no-gutters>
    <v-col class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-col>
  </v-row>
  <v-container v-else>
    <h2 v-if="popularProfiles.length <= 8" class="text-h5 font-weight-light mb-4">Most Popular Profiles</h2>
    <ProfileGrid :profiles="popularProfiles" :limit="8"/>
    <v-row v-if="popularProfiles.length <= 8">
      <v-col class="text-right mr-12">
        <NuxtLink to="/profiles/popular">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            See More Popular Profiles
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const popularProfiles = ref([]);
const { getMostPopularProfiles } = useDb();

const isLoading = ref(true);
const props = defineProps({
  limit: Number,
});

onMounted(async () => {
  // Fetch data on component mount
  const data = await getMostPopularProfiles(props.limit);
  if (data) {
    popularProfiles.value = data.slice(0, props.limit); // Limit to 4 profiles for display
  }
  console.log("Most Popular Profiles: ", popularProfiles.value);
  isLoading.value = false;
});
</script>
