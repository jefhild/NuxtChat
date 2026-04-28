<template>
  <div
    class="settings-media-row grid justify-center gap-4"
    :class="showPhotoLibrary ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'"
  >
    <div class="flex flex-col items-center">
      <!-- {{ isEditable ? "Edit Mode" : "View Mode" }} -->
      <SettingsProfilePhoto
        :editable="isEditable"
        :userId="userProfile.user_id"
        :avatarUrl="avatar"
        :avatarDecorationUrl="avatarDecorationUrl"
        :showDecorationControl="showDecorationControl"
        :decorationLocked="decorationLocked"
        :photoLibraryPhotos="photoLibraryPhotos"
        :randomLoading="randomLoading"
        :uploadLoading="uploadLoading"
        :errorMessage="errorMessage"
        :userProfile="userProfile"
        :refreshLookingForMenu="refreshLookingForMenu"
        :displayKey="displayKey"
        @updateAvatarUrl="$emit('updateAvatarUrl', $event)"
        @randomAvatar="$emit('randomAvatar')"
        @uploadAvatar="$emit('uploadAvatar', $event)"
        @openDecorationPicker="$emit('openDecorationPicker')"
        @lookingForUpdated="$emit('refreshLookingForDisplay')"
      />
    </div>
    <div
      v-if="showPhotoLibrary"
      class="mt-4 flex flex-col items-center md:mt-0"
    >
      <div
        class="photo-library-card"
        :class="{
          'photo-library-card--disabled': photoLibraryDisabled,
          'photo-library-card--readonly': photoLibraryDisabled || !isEditable,
          'photo-library-card--editing': !photoLibraryDisabled && isEditable
        }"
      >
        <div class="photo-library-hero">
          <div
            v-if="photoLibraryDisabled"
            class="photo-library-locked-badge"
          >
            <i class="mdi mdi-lock mr-1 photo-library-locked-badge__icon" aria-hidden="true" />
            {{ t("components.photo-library.locked-preview") }}
          </div>
          <div v-if="photoLibraryDisabled" class="photo-library-hero-skeleton" aria-hidden="true" />
          <template v-else>
            <NuxtImg
              v-if="heroPhoto"
              :src="heroPhoto"
              class="photo-library-hero-image"
              :style="heroPhotoStyle"
              alt="Photo library hero"
              @load="onHeroPhotoLoad"
            />
            <div v-else class="photo-library-hero-placeholder">
              <i class="mdi mdi-image-multiple photo-library-hero-placeholder__icon" aria-hidden="true" />
            </div>
          </template>
        </div>
        <div class="photo-library-body">
          <div class="photo-library-strip-wrap">
            <button
              type="button"
              class="photo-library-chevron left"
              :disabled="photoLibraryDisabled"
              @click="scrollThumbs(-1)"
            >
              <i class="mdi mdi-chevron-left photo-library-chevron__icon" aria-hidden="true" />
            </button>
            <div ref="thumbsRef" class="photo-library-strip">
              <div
                v-for="(item, idx) in photoSlots"
                :key="idx"
                class="photo-library-slot"
              >
                <template v-if="!photoLibraryDisabled && item">
                  <button
                    type="button"
                    class="photo-library-thumb"
                    @click="setHeroFromIndex(idx)"
                  >
                    <img
                      :src="item.url || item.public_url"
                      class="photo-library-thumb__image"
                      alt=""
                    />
                  </button>
                </template>
                <div
                  v-else
                  class="photo-library-skeleton"
                  aria-hidden="true"
                />
              </div>
            </div>
            <button
              type="button"
              class="photo-library-chevron right"
              :disabled="photoLibraryDisabled"
              @click="scrollThumbs(1)"
            >
              <i class="mdi mdi-chevron-right photo-library-chevron__icon" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div class="photo-library-footer">
          <button
            type="button"
            class="ui-settings-text-link photo-library-link-btn"
            :disabled="photoLibraryDisabled"
            @click="$emit('openPhotoLibrary')"
          >
            {{ t("components.photo-library.link") }}
            <i class="mdi mdi-arrow-expand-right ml-1 photo-library-link-btn__icon" aria-hidden="true" />
          </button>
          <span
            v-if="photoLibraryDisabled"
            class="photo-library-hint photo-library-hint-link"
            role="button"
            tabindex="0"
            @click="$emit('openLinkEmail')"
            @keydown.enter.prevent="$emit('openLinkEmail')"
          >
            {{ t("components.photo-library.disabled-hint") }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { computed, ref, watch } from "vue";

const { t } = useI18n();

const props = defineProps({
  userProfile: Object,
  avatar: String,
  isEditable: Boolean,
  refreshLookingForMenu: Boolean,
  displayKey: Number,
  randomLoading: Boolean,
  uploadLoading: Boolean,
  errorMessage: String,
  avatarDecorationUrl: {
    type: String,
    default: "",
  },
  showDecorationControl: {
    type: Boolean,
    default: false,
  },
  decorationLocked: {
    type: Boolean,
    default: false,
  },
  showPhotoLibrary: Boolean,
  photoLibraryDisabled: {
    type: Boolean,
    default: false,
  },
  photoLibraryPhotos: {
    type: Array,
    default: () => [],
  },
});

defineEmits([
  "updateAvatarUrl",
  "refreshLookingForDisplay",
  "randomAvatar",
  "uploadAvatar",
  "openDecorationPicker",
  "openPhotoLibrary",
  "openLinkEmail",
]);

const photoSlots = computed(() => {
  const items = Array.isArray(props.photoLibraryPhotos)
    ? props.photoLibraryPhotos
    : [];
  return Array.from({ length: 6 }, (_, idx) => items[idx] || null);
});

const thumbsRef = ref(null);
const heroIndex = ref(0);
const heroPhotoRatio = ref(1);

const heroPhoto = computed(() => {
  const items = Array.isArray(props.photoLibraryPhotos)
    ? props.photoLibraryPhotos
    : [];
  if (!items.length) return "";
  const item = items[heroIndex.value % items.length];
  return item?.url || item?.public_url || "";
});
const heroPhotoStyle = computed(() => ({
  objectFit: heroPhotoRatio.value <= 1.2 ? "contain" : "cover",
  objectPosition: "50% 35%",
}));

const setHeroFromIndex = (idx) => {
  if (props.photoLibraryDisabled) return;
  const items = Array.isArray(props.photoLibraryPhotos)
    ? props.photoLibraryPhotos
    : [];
  if (!items[idx]) return;
  heroIndex.value = idx;
};

const onHeroPhotoLoad = (event) => {
  const image = event.target;
  const width = Number(image?.naturalWidth || 0);
  const height = Number(image?.naturalHeight || 0);
  heroPhotoRatio.value = width && height ? width / height : 1;
};

const scrollThumbs = (direction) => {
  if (props.photoLibraryDisabled) return;
  const container = thumbsRef.value;
  if (!container) return;
  const step = 68;
  container.scrollTo({
    left: container.scrollLeft + step * direction,
    behavior: "smooth",
  });
};

watch(
  () => props.photoLibraryPhotos,
  (next) => {
    const items = Array.isArray(next) ? next : [];
    heroIndex.value = items.length ? Math.floor(Math.random() * items.length) : 0;
    heroPhotoRatio.value = 1;
  },
  { immediate: true }
);
</script>

<style scoped>
.settings-media-row {
  margin-top: 18px;
  margin-bottom: 18px;
}

:deep(.profile-photo-card) {
  width: 360px;
  max-width: 100%;
}

.photo-library-card {
  display: flex;
  flex-direction: column;
  width: 360px;
  max-width: 100%;
  min-height: 296px;
  border-radius: 16px;
  overflow: visible;
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.98),
    rgb(var(--color-surface-elevated) / 0.94)
  );
  border: 1px solid rgb(var(--color-border) / 0.72);
  box-shadow: 0 14px 32px rgb(var(--color-shadow) / 0.08);
}

.photo-library-card--editing {
  border-color: rgb(var(--color-secondary) / 0.38);
  box-shadow:
    0 18px 36px rgb(var(--color-shadow) / 0.12),
    0 0 0 1px rgb(var(--color-secondary) / 0.16);
}

.photo-library-card--readonly {
  background: rgb(var(--color-surface) / 0.94);
}

.photo-library-card--disabled {
  border-color: rgb(var(--color-border) / 0.72);
  box-shadow: 0 14px 32px rgb(var(--color-shadow) / 0.08);
}

.photo-library-hero {
  position: relative;
  height: 160px;
  background: #101010;
}

.photo-library-hero-image {
  width: 100%;
  height: 100%;
}

.photo-library-hero-skeleton {
  width: 100%;
  height: 100%;
  opacity: 0.95;
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0.72) 0%,
    rgba(51, 65, 85, 0.95) 50%,
    rgba(30, 41, 59, 0.72) 100%
  );
  background-size: 200% 100%;
  animation: profile-photo-skeleton 1.6s ease-in-out infinite;
}

.photo-library-locked-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 0.72rem;
  color: rgb(var(--color-foreground) / 0.94);
  background: rgb(var(--color-surface-elevated) / 0.9);
  border: 1px solid rgb(var(--color-border) / 0.72);
}

.photo-library-locked-badge__icon {
  font-size: 14px;
  line-height: 1;
}

.photo-library-hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1c1c1c, #2a2a2a);
}

.photo-library-hero-placeholder__icon {
  font-size: 40px;
  color: #cbd5e1;
}

.photo-library-body {
  flex: 1 1 auto;
  padding: 12px;
}

.photo-library-strip-wrap {
  position: relative;
  padding: 0 18px;
}

.photo-library-strip {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 2px;
  max-width: 260px;
  margin: 0 auto;
}

.photo-library-chevron {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgb(var(--color-surface) / 0.92);
  border: 1px solid rgb(var(--color-border) / 0.72);
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgb(var(--color-foreground));
}

.photo-library-chevron:hover:not(:disabled),
.photo-library-chevron:focus-visible {
  border-color: rgb(var(--color-secondary) / 0.28);
  color: rgb(var(--color-heading));
  outline: none;
}

.photo-library-chevron:disabled {
  opacity: 0.5;
  cursor: default;
}

.photo-library-chevron__icon {
  font-size: 18px;
  line-height: 1;
}

.photo-library-chevron.left {
  left: -8px;
}

.photo-library-chevron.right {
  right: -8px;
}

.photo-library-slot {
  flex: 0 0 64px;
}

.photo-library-skeleton {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  opacity: 0.95;
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0.72) 0%,
    rgba(51, 65, 85, 0.95) 50%,
    rgba(30, 41, 59, 0.72) 100%
  );
  background-size: 200% 100%;
  animation: profile-photo-skeleton 1.6s ease-in-out infinite;
}

.photo-library-thumb {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  width: 64px;
  height: 64px;
  cursor: pointer;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface) / 0.9);
}

.photo-library-thumb__image {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
}

.photo-library-footer {
  margin-top: auto;
  display: flex;
  justify-content: flex-start;
  padding: 8px 12px 12px;
  border-top: 1px solid rgb(var(--color-border) / 0.52);
  min-height: 44px;
  align-items: center;
  gap: 8px;
}

.photo-library-hint {
  font-size: 13px;
  color: rgb(var(--color-foreground) / 0.72);
}

.photo-library-hint-link {
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.photo-library-card--disabled .photo-library-link-btn {
  color: rgb(var(--color-secondary)) !important;
}

.photo-library-card--disabled .photo-library-hint-link {
  color: rgb(var(--color-foreground) / 0.95);
}

.photo-library-link-btn {
  display: inline-flex;
  align-items: center;
}

.photo-library-link-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.photo-library-link-btn__icon {
  font-size: 1rem;
  line-height: 1;
}

@keyframes profile-photo-skeleton {
  0% {
    background-position: 100% 50%;
  }
  100% {
    background-position: 0 50%;
  }
}
</style>
