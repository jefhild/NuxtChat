<template>
  <v-container v-if="!isLoading">
    <h2
      v-if="femaleProfiles.length <= 4"
      class="text-h5 font-weight-light mb-4"
    >
    {{ $t("components.home.female.title") }}
    </h2>
    <ProfileGrid :profiles="femaleProfiles" :limit="8" />
    <v-row v-if="limit < 4">
      <v-col class="text-right mr-12">
        <NuxtLink :to="localPath('/profiles/female')">
          <v-btn variant="outlined" color="primary" class="font-style-poppins">
            {{ $t("components.home.female.see-more") }}
          </v-btn>
        </NuxtLink>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
const femaleProfiles = ref([]);
const profileLimit = 100;
const isLoading = ref(true);

const emit = defineEmits(["loaded"]);

const { getRecentFemales, getProfileTranslationsForUsers } = useDb();

const props = defineProps({
  limit: Number,
});

import { useI18n } from "vue-i18n";
const { t } = useI18n();

onMounted(async () => {
  const data = await getRecentFemales(props.limit);
  let next = Array.isArray(data) ? data : [];
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
      console.warn("[HomeFemale] translations failed:", err);
    }
  }
  femaleProfiles.value = next;
  isLoading.value = false;
  emit("loaded");
});
</script>
