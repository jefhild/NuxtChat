<template>
  <v-dialog
    v-model="isOpen"
    class="profile-dialog"
    max-width="920"
    width="92vw"
    scrollable
  >
    <ProfileCard
      v-if="profile"
      :profile="profile"
      :avatar-decoration="avatarDecoration"
      :stats="stats"
    >
      <template #overlay>
        <v-btn
          class="profile-dialog-close"
          icon="mdi-close"
          size="small"
          variant="text"
          aria-label="Close profile dialog"
          @click="isOpen = false"
        />
      </template>
    </ProfileCard>
    <v-card v-else class="pa-4" max-width="460">
      <v-skeleton-loader v-if="isLoading" type="card" />
      <div v-else class="text-body-2 text-medium-emphasis text-center py-6">
        Profile unavailable.
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from "vue";
import ProfileCard from "@/components/ProfileCard.vue";
import { useUserProfile } from "@/composables/useUserProfile";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  userId: { type: [String, Number], default: null },
  slug: { type: String, default: null },
});

const emit = defineEmits(["update:modelValue"]);

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit("update:modelValue", value),
});

const { profile, fetchUserProfileFromSlug, fetchUserProfile } =
  useUserProfile();
const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");
const isLoading = ref(false);
const stats = ref(null);

const loadStats = async () => {
  const userId = profile.value?.user_id || null;
  if (!userId) {
    stats.value = null;
    return;
  }
  try {
    stats.value = await $fetch("/api/profile/stats", {
      query: { userId },
    });
  } catch (error) {
    console.error("[profile][stats] load error", error);
    stats.value = null;
  }
};

const loadProfile = async () => {
  if (!props.slug && !props.userId) {
    profile.value = null;
    avatarDecoration.value = "";
    return;
  }
  isLoading.value = true;
  try {
    if (props.slug) {
      await fetchUserProfileFromSlug(props.slug);
    } else if (props.userId) {
      await fetchUserProfile(props.userId);
    }
    avatarDecoration.value = profile.value?.user_id
      ? await getAvatarDecorationFromId(profile.value.user_id)
      : "";
    await loadStats();
  } finally {
    isLoading.value = false;
  }
};

watch(
  () => [props.slug, props.userId, props.modelValue],
  ([, , open]) => {
    if (!open) return;
    loadProfile();
  },
  { immediate: true }
);
</script>

<style scoped>
.profile-dialog-close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
}

.profile-dialog :deep(.v-overlay__content) {
  max-width: 920px;
  width: 92vw;
}
</style>
