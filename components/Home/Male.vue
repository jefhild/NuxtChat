<template>
  <v-container v-if="!isLoading">
    <h2 v-if="maleProfiles.length <= 4" class="text-h5 font-weight-light mb-4">
      {{ $t("components.home.male.title") }}
    </h2>
    <ProfileGrid :profiles="maleProfiles" :limit="8" />
    <v-row v-if="maleProfiles.length <= 4">
      <v-col class="text-right mr-12">
        <NuxtLink :to="localPath('/profiles/male')">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            {{ $t("components.home.male.see-more") }}
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
const maleProfiles = ref([]);
const profileLimit = 100;
const isLoading = ref(true);

import { useI18n } from "vue-i18n";
const { t } = useI18n();

const emit = defineEmits(["loaded"]);

const { getRecentMales } = useDb();

const props = defineProps({
  limit: Number,
});

onMounted(async () => {
  const data = await getRecentMales(profileLimit);
  if (data) {
    maleProfiles.value = data.slice(0, props.limit); // Limit to 4 profiles for display
  }
  isLoading.value = false;
  emit("loaded");
});
</script>
