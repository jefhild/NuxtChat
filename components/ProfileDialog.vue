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
      :photo-gallery-photos="photoGalleryPhotos"
      :photo-gallery-count="photoGalleryCount"
      :gallery-blurred="!canViewGallery"
      @likePhoto="handlePhotoVote"
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
import { useAuthStore } from "@/stores/authStore1";

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
const authStore = useAuthStore();
const { getAvatarDecorationFromId } = useDb();
const avatarDecoration = ref("");
const isLoading = ref(false);
const stats = ref(null);
const photoGalleryPhotos = ref([]);
const photoGalleryCount = ref(0);

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const canViewGallery = computed(() => authStore.authStatus === "authenticated");

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
    photoGalleryPhotos.value = [];
    photoGalleryCount.value = 0;
    return;
  }
  isLoading.value = true;
  try {
    if (props.slug) {
      await fetchUserProfileFromSlug(props.slug);
    } else if (props.userId) {
      await fetchUserProfile(props.userId);
    }
    const resolvedId = profile.value?.user_id || profile.value?.id;
    avatarDecoration.value = resolvedId
      ? await getAvatarDecorationFromId(resolvedId)
      : "";
    await loadPhotoGallery(resolvedId);
    await loadStats();
  } finally {
    isLoading.value = false;
  }
};

const loadPhotoGallery = async (userId) => {
  if (!userId) {
    photoGalleryPhotos.value = [];
    photoGalleryCount.value = 0;
    return;
  }
  try {
    const res = await $fetch("/api/profile/photos-public", {
      query: { userId },
    });
    photoGalleryPhotos.value = Array.isArray(res?.photos) ? res.photos : [];
    photoGalleryCount.value = Number(res?.count || 0);
  } catch (error) {
    console.warn("[profile-dialog] gallery load error:", error);
    photoGalleryPhotos.value = [];
    photoGalleryCount.value = 0;
  }
};

const handlePhotoVote = async (photo) => {
  if (!photo?.id || !canViewGallery.value) return;
  try {
    const res = await $fetch("/api/votes/profile-photo", {
      method: "POST",
      body: { photoId: photo.id, value: 1 },
    });
    photoGalleryPhotos.value = photoGalleryPhotos.value.map((item) =>
      item.id === photo.id
        ? {
            ...item,
            upvotes: Number(res?.upvotes ?? item.upvotes ?? 0),
            myVote: Number(res?.userVote ?? item.myVote ?? 0),
          }
        : item
    );
  } catch (error) {
    console.error("[profile-dialog] photo vote failed:", error);
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

onMounted(async () => {
  await authStore.checkAuth();
});
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
