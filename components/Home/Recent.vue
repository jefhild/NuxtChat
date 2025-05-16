<template>
  <v-row v-if="isLoading" justify="center" no-gutters>
    <v-col class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-col>
  </v-row>
  <v-container v-else>
    <h2 v-if="recentProfiles.length <= 4" class="text-h5 font-weight-light mb-4">Recent Profiles</h2>
    <ProfileGrid :profiles="recentProfiles" :limit="8" />
    <v-row v-if="recentProfiles.length <= 4">
      <v-col class="text-right mr-12">
        <NuxtLink to="/profiles/recent">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            See More Recent Profiles
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>

const props = defineProps({
  limit: Number,
});

const isLoading = ref(true);
const recentProfiles = ref([]);
const profileLimit = 100;
const { getRecentProfiles } = useDb();

onMounted(async () =>
{
  const data = await getRecentProfiles(props.limit);
  if (data)
  {
    recentProfiles.value = data.slice(0, props.limit); // Limit to 4 profiles for display
  }
  // console.log("Recent Profiles:", recentProfiles.value);
  isLoading.value = false;
});
</script>
