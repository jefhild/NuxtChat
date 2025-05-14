<template>
  <v-row v-if="isLoading" justify="center" no-gutters>
    <v-col class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-col>
  </v-row>
  <v-container v-else>
      <h2 v-if="maleProfiles.length <= 4" class="text-h5 font-weight-light mb-4">Male Profiles</h2>
      <ProfileGrid :profiles="maleProfiles" :limit="8" />
      <v-row v-if="maleProfiles.length <= 4">
        <v-col class="text-right mr-12">
          <NuxtLink to="/profiles/male">
            <v-btn variant="outlined" color="primary" class="font-style-poppins">
              See More Male Profiles
            </v-btn>
          </NuxtLink>
        </v-col>
      </v-row>
    </v-container>
</template>

<script setup>
const maleProfiles = ref([]);
const profileLimit = 100;
const isLoading = ref(true);

const { getRecentMales } = useDb();

const props = defineProps({
  limit: Number,
});

onMounted(async () =>
{
  const data = await getRecentMales(profileLimit);
  if (data)
  {
    maleProfiles.value = data.slice(0, props.limit); // Limit to 4 profiles for display
  }
  isLoading.value = false;
});
</script>
