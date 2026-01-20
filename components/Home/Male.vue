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

const { getRecentMales, getProfileTranslationsForUsers } = useDb();

const props = defineProps({
  limit: Number,
});

onMounted(async () => {
  const data = await getRecentMales(profileLimit);
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
      console.warn("[HomeMale] translations failed:", err);
    }
  }
  maleProfiles.value = next;
  isLoading.value = false;
  emit("loaded");
});
</script>
