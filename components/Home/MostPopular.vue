<template>
  <v-container v-if="!isLoading">
    <h2 v-if="popularProfiles.length <= 8" class="text-h5 font-weight-light mb-4">{{ $t("components.home.most-popular.title") }}</h2>
    <ProfileGrid :profiles="popularProfiles" :limit="8"/>
    <v-row v-if="popularProfiles.length <= 8">
      <v-col class="text-right mr-12">
        <NuxtLink :to="localPath('/profiles/popular')">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            {{ $t("components.home.most-popular.see-more") }}
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
const popularProfiles = ref([]);
const { getMostPopularProfiles, getProfileTranslationsForUsers } = useDb();

const emit = defineEmits(['loaded']);

import { useI18n } from "vue-i18n";
const { t } = useI18n();

const isLoading = ref(true);
const props = defineProps({
  limit: Number,
});

onMounted(async () => {
  // Fetch data on component mount
  const data = await getMostPopularProfiles(props.limit);
  let next = Array.isArray(data) ? data.slice(0, props.limit) : [];
  const userIds = next.map((p) => p?.user_id).filter(Boolean);
  if (userIds.length) {
    try {
      const { data: translations } =
        await getProfileTranslationsForUsers(userIds);
      const map = new Map();
      (translations || []).forEach((row) => {
        const key = row.user_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
      });
      next = next.map((p) => ({
        ...p,
        profile_translations: map.get(p.user_id) || [],
      }));
    } catch (err) {
      console.warn("[HomeMostPopular] translations failed:", err);
    }
  }
  popularProfiles.value = next;
  // console.log("Most Popular Profiles: ", popularProfiles.value);
  isLoading.value = false;
  emit('loaded');
});
</script>
