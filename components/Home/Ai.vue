<template>
  <v-container v-if="!isLoading">
    <h2 v-if="limit <= 4" class="text-h5 font-weight-light mb-4">
      Recent AI Profiles
    </h2>

    <ProfileGrid :profiles="mostPopularAiProfiles" :limit="limit" />

    <v-row v-if="limit <= 4">
      <v-col class="text-right mr-12">
        <NuxtLink :to="localPath('/profiles/ai')">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            See More AI Profiles
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
const props = defineProps({
  limit: {
    type: Number,
    default: 4,
  },
});

const emit = defineEmits(["loaded"]);

const mostPopularAiProfiles = ref([]);
const isLoading = ref(true);
const { getMostPopularAiProfiles } = useDb();

onMounted(async () => {
  const data = await getMostPopularAiProfiles(props.limit);
  if (data) {
    mostPopularAiProfiles.value = data;
  }

  isLoading.value = false;
  emit("loaded");
});
</script>
