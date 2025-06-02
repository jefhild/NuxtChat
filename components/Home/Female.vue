<template>
  <v-container v-if="!isLoading">
    <h2
      v-if="femaleProfiles.length <= 4"
      class="text-h5 font-weight-light mb-4"
    >
      Recent Female Profiles
    </h2>
    <ProfileGrid :profiles="femaleProfiles" :limit="8" />
    <v-row v-if="femaleProfiles.length <= 4">
      <v-col class="text-right mr-12">
        <NuxtLink to="/profiles/female">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            See More Female Profiles
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const femaleProfiles = ref([]);
const profileLimit = 100;
const isLoading = ref(true);

const emit = defineEmits(["loaded"]);

const { getRecentFemales } = useDb();

const props = defineProps({
  limit: Number,
});

onMounted(async () => {
  const data = await getRecentFemales(profileLimit);
  if (data) {
    femaleProfiles.value = data.slice(0, props.limit); // Limit to 4 profiles for display
  }
  isLoading.value = false;
  emit("loaded");
});
</script>
