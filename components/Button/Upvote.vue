<template>
  <button
    type="button"
    class="profile-upvote-btn"
    :class="{ 'is-active': hasVoted }"
    :disabled="!!isOwnProfile || isLoading"
    :title="tooltipText"
    :aria-label="tooltipText"
    @click.stop="handleUpvote"
  >
    <i
      :class="[
        'mdi',
        hasVoted ? 'mdi-thumb-up' : 'mdi-thumb-up-outline',
        'profile-upvote-btn__icon',
      ]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const authStore = useAuthStore();

const props = defineProps({
  profile: Object,
});

const emit = defineEmits(["upvoted"]);

const hasVoted = ref(false);
const isLoading = ref(false);
const count = ref(props.profile?.upvote_count ?? props.profile?.upvotes_count ?? props.profile?.upvotes ?? 0);
let lastStatusRequestId = 0;

const isOwnProfile = computed(
  () => authStore.user?.id && props.profile?.user_id === authStore.user?.id
);

const tooltipText = computed(() => {
  if (isOwnProfile.value) return t("components.button-upvote.own-profile");
  if (hasVoted.value) return t("components.button-upvote.already-voted");
  return t("components.button-upvote.upvote");
});

const syncCountFromProfile = () => {
  count.value =
    props.profile?.upvote_count ??
    props.profile?.upvotes_count ??
    props.profile?.upvotes ??
    0;
};

const loadVoteState = async () => {
  const requestId = ++lastStatusRequestId;

  syncCountFromProfile();
  hasVoted.value = false;

  if (!authStore.user?.id || !props.profile?.user_id || isOwnProfile.value) return;

  try {
    const data = await $fetch(
      `/api/votes/profile-status?profileUserId=${props.profile.user_id}`
    );

    if (requestId !== lastStatusRequestId) return;

    hasVoted.value = data.hasVoted;
    if (data.upvoteCount >= 0) {
      count.value = data.upvoteCount;
    }
    if (data.hasVoted && data.upvoteCount > 0) {
      emit("upvoted", { userId: props.profile.user_id, count: data.upvoteCount });
    }
  } catch {
    if (requestId !== lastStatusRequestId) return;
    // silent — button just starts in un-voted state
  }
};

watch(
  () => [authStore.user?.id, props.profile?.user_id],
  () => {
    loadVoteState();
  },
  { immediate: true }
);

watch(
  () => [props.profile?.upvote_count, props.profile?.upvotes_count, props.profile?.upvotes],
  () => {
    syncCountFromProfile();
  }
);

const handleUpvote = async () => {
  if (!authStore.user?.id || !props.profile?.user_id || isLoading.value || hasVoted.value) return;
  isLoading.value = true;
  try {
    const data = await $fetch("/api/votes/profile", {
      method: "POST",
      body: { profileUserId: props.profile.user_id },
    });
    hasVoted.value = data.hasVoted;
    count.value = data.upvotes;
    emit("upvoted", { userId: props.profile.user_id, count: data.upvotes });
  } catch (e) {
    console.error("Upvote error:", e);
  } finally {
    isLoading.value = false;
  }
};
</script>

<style scoped>
.profile-upvote-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #93c5fd;
  cursor: pointer;
  transition: color 0.18s ease, background-color 0.18s ease, opacity 0.18s ease;
}

.profile-upvote-btn.is-active {
  color: #f59e0b;
}

.profile-upvote-btn:hover:not(:disabled),
.profile-upvote-btn:focus-visible {
  background: rgba(59, 130, 246, 0.12);
  outline: none;
}

.profile-upvote-btn:disabled {
  cursor: default;
  opacity: 0.55;
}

.profile-upvote-btn__icon {
  font-size: 1.1rem;
  color: currentColor;
}
</style>
