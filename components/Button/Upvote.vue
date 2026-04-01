<template>
  <v-tooltip :text="tooltipText" location="top">
    <template #activator="{ props: tooltipProps }">
      <span v-bind="tooltipProps">
        <v-btn
          :color="hasVoted ? 'amber-darken-1' : 'medium-emphasis'"
          :icon="hasVoted ? 'mdi-thumb-up' : 'mdi-thumb-up-outline'"
          size="small"
          variant="text"
          :disabled="!!isOwnProfile || isLoading || hasVoted"
          @click="handleUpvote"
        ></v-btn>
      </span>
    </template>
  </v-tooltip>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const authStore = useAuthStore();

const props = defineProps({
  profile: Object,
});

const hasVoted = ref(false);
const isLoading = ref(false);
const count = ref(props.profile?.upvotes_count ?? props.profile?.upvotes ?? 0);

const isOwnProfile = computed(
  () => authStore.user?.id && props.profile?.user_id === authStore.user?.id
);

const tooltipText = computed(() => {
  if (isOwnProfile.value) return t("components.button-upvote.own-profile");
  if (hasVoted.value) return t("components.button-upvote.already-voted");
  return t("components.button-upvote.upvote");
});

onMounted(async () => {
  if (!authStore.user?.id || !props.profile?.user_id) return;
  if (isOwnProfile.value) return;
  try {
    const data = await $fetch(
      `/api/votes/profile-status?profileUserId=${props.profile.user_id}`
    );
    hasVoted.value = data.hasVoted;
  } catch {
    // silent — button just starts in un-voted state
  }
});

const handleUpvote = async () => {
  if (!authStore.user?.id || !props.profile?.user_id || isLoading.value) return;
  isLoading.value = true;
  try {
    const data = await $fetch("/api/votes/profile", {
      method: "POST",
      body: { profileUserId: props.profile.user_id },
    });
    hasVoted.value = data.hasVoted;
    count.value = data.upvotes;
  } catch (e) {
    console.error("Upvote error:", e);
  } finally {
    isLoading.value = false;
  }
};
</script>
