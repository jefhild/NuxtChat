<template>
  <Teleport to="body">
    <Transition name="profile-dialog-fade">
      <div
        v-if="isOpen"
        class="profile-dialog"
        role="presentation"
      >
        <button
          type="button"
          class="profile-dialog__scrim"
          aria-label="Close profile dialog"
          @click="isOpen = false"
        />
        <div
          class="profile-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-dialog-title"
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
            @chat-now="isOpen = false"
            @upvoted="emit('upvoted', $event)"
          >
            <template #overlay>
              <button
                type="button"
                class="profile-dialog-close"
                aria-label="Close profile dialog"
                @click="isOpen = false"
              >
                <i class="mdi mdi-close" aria-hidden="true" />
              </button>
            </template>
          </ProfileCard>

          <div v-else class="profile-dialog__fallback">
            <div v-if="isLoading" class="profile-dialog__skeleton" aria-hidden="true">
              <div class="profile-dialog__skeleton-line profile-dialog__skeleton-line--title" />
              <div class="profile-dialog__skeleton-line" />
              <div class="profile-dialog__skeleton-line" />
              <div class="profile-dialog__skeleton-line profile-dialog__skeleton-line--short" />
            </div>
            <div v-else class="profile-dialog__empty">
              Profile unavailable.
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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

const emit = defineEmits(["update:modelValue", "upvoted"]);

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

const canViewGallery = computed(() => authStore.authStatus === "authenticated");

const resolveProfileAvatar = async (userId) => {
  if (!userId || !profile.value) return;
  try {
    const result = await $fetch("/api/profile/avatar-resolve", {
      query: { userId },
    });
    const avatarUrl = String(result?.avatarUrl || "");
    if (avatarUrl) {
      profile.value = {
        ...profile.value,
        avatar_url: avatarUrl,
      };
    }
  } catch (error) {
    console.warn("[profile-dialog] avatar resolve error:", error);
  }
};

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
    await resolveProfileAvatar(resolvedId);
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
.profile-dialog {
  position: fixed;
  inset: 0;
  z-index: 2200;
}

.profile-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.72);
}

.profile-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(92vw, 920px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  transform: translate(-50%, -50%);
  padding: 0.35rem;
}

.profile-dialog-close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid rgba(191, 219, 254, 0.18);
  border-radius: 999px;
  background: rgb(15 23 42 / 0.62);
  color: rgb(226 232 240);
  cursor: pointer;
}

.profile-dialog-close:hover,
.profile-dialog-close:focus-visible {
  background: rgb(15 23 42 / 0.82);
  border-color: rgba(191, 219, 254, 0.3);
  outline: none;
}

.profile-dialog__fallback {
  width: min(100%, 460px);
  margin: 0 auto;
  padding: 1.1rem;
  border-radius: 20px;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.98),
    rgb(var(--color-surface-elevated) / 0.96)
  );
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.profile-dialog__skeleton {
  display: grid;
  gap: 0.75rem;
}

.profile-dialog__skeleton-line {
  height: 0.9rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.18),
    rgba(148, 163, 184, 0.34),
    rgba(148, 163, 184, 0.18)
  );
  background-size: 200% 100%;
  animation: profile-dialog-skeleton 1.1s linear infinite;
}

.profile-dialog__skeleton-line--title {
  width: 56%;
  height: 1.1rem;
}

.profile-dialog__skeleton-line--short {
  width: 70%;
}

.profile-dialog__empty {
  padding: 1.5rem 0.75rem;
  text-align: center;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 0.95rem;
  line-height: 1.5;
}

.profile-dialog-fade-enter-active,
.profile-dialog-fade-leave-active {
  transition: opacity 160ms ease;
}

.profile-dialog-fade-enter-from,
.profile-dialog-fade-leave-to {
  opacity: 0;
}

@keyframes profile-dialog-skeleton {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

@media (max-width: 640px) {
  .profile-dialog__panel {
    width: calc(100vw - 1rem);
    max-height: calc(100vh - 1rem);
  }
}
</style>
