<template>
  <div class="flex flex-col items-center">
    <section
      class="profile-photo-card"
      :class="editable ? 'profile-photo-card--editing' : 'profile-photo-card--readonly'"
    >
      <div class="photo-hero">
        <img
          v-if="heroImage"
          :src="heroImage"
          class="photo-hero-image"
          :style="heroImageStyle"
          alt="Profile Image"
          @load="onHeroImageLoad"
        >
        <img
          v-if="avatarDecorationUrl"
          :src="avatarDecorationUrl"
          class="photo-avatar-decoration"
          alt=""
        >
        <div v-if="!heroImage" class="photo-hero-placeholder">
          <i class="mdi mdi-account photo-hero-placeholder__icon" aria-hidden="true" />
        </div>
        <div v-if="editable || showDecorationControl" class="photo-hero-controls">
          <button
            type="button"
            class="ui-settings-icon-btn photo-control-btn"
            :disabled="!editable || randomLoading"
            :title="$t('components.profile-photo.random-title')"
            @click="$emit('randomAvatar')"
          >
            <span v-if="randomLoading" class="photo-control-btn__spinner" aria-hidden="true" />
            <i v-else class="mdi mdi-dice-5-outline" aria-hidden="true" />
          </button>
          <button
            type="button"
            class="ui-settings-icon-btn photo-control-btn"
            :disabled="!editable || uploadLoading"
            :title="$t('components.profile-photo.upload-title')"
            @click="triggerFilePicker"
          >
            <span v-if="uploadLoading" class="photo-control-btn__spinner" aria-hidden="true" />
            <i v-else class="mdi mdi-upload" aria-hidden="true" />
          </button>
          <button
            v-if="showDecorationControl"
            type="button"
            class="ui-settings-icon-btn photo-control-btn"
            :title="
              decorationLocked
                ? $t('components.profile-photo.decoration-locked-title')
                : $t('components.profile-photo.decoration-title')
            "
            @click="$emit('openDecorationPicker')"
          >
            <i
              class="mdi"
              :class="decorationLocked ? 'mdi-lock' : 'mdi-image-filter-center-focus'"
              aria-hidden="true"
            />
          </button>
          <input
            ref="fileInput"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            class="sr-only"
            @change="onFileChange"
          >
        </div>
        <div class="photo-hero-overlay">
          <div class="photo-line">
            <span class="photo-name">{{ userProfile?.displayname }}</span>
            <span class="photo-dot">•</span>
            <span class="photo-tagline">{{ userProfile?.tagline }}</span>
            <a
              v-if="userProfile?.site_url"
              class="photo-link"
              :href="userProfile.site_url"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open public site"
            >
              <i class="mdi mdi-link-variant" aria-hidden="true" />
            </a>
          </div>
        </div>
      </div>

      <div class="photo-library-body">
        <div class="photo-library-strip-wrap">
          <button
            type="button"
            class="photo-library-chevron left"
            :disabled="loadingGenderOptions || !hasCarousel"
            @click="scrollThumbs(-1)"
          >
            <i class="mdi mdi-chevron-left" aria-hidden="true" />
          </button>
          <div ref="thumbsRef" class="photo-library-strip">
            <div
              v-for="(item, idx) in photoSlots"
              :key="`${item?.key || 'slot'}-${idx}`"
              class="photo-library-slot"
            >
              <template v-if="item">
                <button
                  type="button"
                  class="photo-library-thumb"
                  :class="{ 'photo-library-thumb--active': item.url === heroImage }"
                  @click="setHeroFromOption(item)"
                >
                  <img :src="item.url" class="photo-library-thumb-image" alt="Photo option">
                </button>
              </template>
              <div v-else class="photo-library-skeleton" />
            </div>
          </div>
          <button
            type="button"
            class="photo-library-chevron right"
            :disabled="loadingGenderOptions || !hasCarousel"
            @click="scrollThumbs(1)"
          >
            <i class="mdi mdi-chevron-right" aria-hidden="true" />
          </button>
        </div>
        <div
          v-if="errorMessage"
          class="photo-status-alert photo-status-alert--error"
        >
          {{ errorMessage }}
        </div>
      </div>
      <div
        v-if="userProfile?.user_id"
        class="photo-lookingfor"
        :class="{ 'lookingfor-disabled': !editable }"
      >
        <SettingsProfileLookingForMenu
          :userProfile="userProfile"
          :refreshLookingForMenu="refreshLookingForMenu"
          :disabled="!editable"
          @lookingForUpdated="editable && $emit('lookingForUpdated')"
        />
        <div class="lookingfor-icons">
          <SettingsProfileLookingForDisplay
            :key="displayKey"
            :userId="userProfile.user_id"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";

const props = defineProps({
  userId: { type: String, required: true },
  editable: { type: Boolean, default: true },
  avatarUrl: { type: String, default: "" },
  photoLibraryPhotos: { type: Array, default: () => [] },
  randomLoading: { type: Boolean, default: false },
  uploadLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
  userProfile: { type: Object, default: null },
  avatarDecorationUrl: { type: String, default: "" },
  showDecorationControl: { type: Boolean, default: false },
  decorationLocked: { type: Boolean, default: false },
  refreshLookingForMenu: { type: Boolean, default: false },
  displayKey: { type: Number, default: 0 },
});

const emit = defineEmits([
  "updateAvatarUrl",
  "randomAvatar",
  "uploadAvatar",
  "openDecorationPicker",
  "lookingForUpdated",
]);
const fileInput = ref<HTMLInputElement | null>(null);
type CarouselOption = {
  key: string;
  url: string;
  source: "current" | "avatar" | "library";
  photoId?: string;
};

const previewAvatar = computed(() => {
  return props.avatarUrl || "";
});
const thumbsRef = ref<HTMLElement | null>(null);
const selectedImage = ref("");
const heroAspectRatio = ref(1);
const heroFocalY = ref(35);
const HERO_DEFAULT_FOCAL_Y = 35;

const normalizedLibraryPhotos = computed(() =>
  (Array.isArray(props.photoLibraryPhotos) ? props.photoLibraryPhotos : [])
    .map((item: any) => item?.url || item?.public_url || "")
    .filter((url: string) => !!url)
);
const genderAvatarOptions = ref<string[]>([]);
const loadingGenderOptions = ref(false);

const photoSlots = computed<CarouselOption[]>(() => {
  const list: CarouselOption[] = [];
  const seen = new Set<string>();

  const pushOption = (option: CarouselOption) => {
    if (!option?.url || seen.has(option.url)) return;
    seen.add(option.url);
    list.push(option);
  };

  if (previewAvatar.value) {
    pushOption({
      key: `current:${previewAvatar.value}`,
      url: previewAvatar.value,
      source: "current",
    });
  }

  for (const url of genderAvatarOptions.value) {
    pushOption({
      key: `avatar:${url}`,
      url,
      source: "avatar",
    });
  }

  const items = Array.isArray(props.photoLibraryPhotos) ? props.photoLibraryPhotos : [];
  for (const item of items as any[]) {
    const url = item?.url || item?.public_url || "";
    pushOption({
      key: `library:${item?.id || url}`,
      url,
      source: "library",
      photoId: item?.id || undefined,
    });
  }

  return list;
});

const heroImage = computed(() => {
  if (selectedImage.value) return selectedImage.value;
  if (previewAvatar.value) return previewAvatar.value;
  if (genderAvatarOptions.value.length) return genderAvatarOptions.value[0];
  return normalizedLibraryPhotos.value[0] || "";
});
const heroObjectFit = computed(() =>
  heroAspectRatio.value <= 1.2 ? "contain" : "cover"
);
const heroImageStyle = computed(() => ({
  objectFit: heroObjectFit.value,
  objectPosition: `50% ${heroFocalY.value}%`,
}));

const getHeroFocusStorageKey = (url: string) =>
  `nuxtchat:hero-focus:${props.userId}:${url}`;

const loadHeroFocalY = (url: string) => {
  heroFocalY.value = HERO_DEFAULT_FOCAL_Y;
  if (!import.meta.client || !url) return;
  try {
    const rawValue = window.localStorage.getItem(getHeroFocusStorageKey(url));
    const parsed = Number(rawValue);
    if (Number.isFinite(parsed)) {
      heroFocalY.value = Math.min(90, Math.max(10, parsed));
    }
  } catch (err) {
    console.warn("[settings] failed to load image focus:", err);
  }
};

const persistHeroFocalY = () => {
  if (!import.meta.client || !heroImage.value) return;
  try {
    window.localStorage.setItem(
      getHeroFocusStorageKey(heroImage.value),
      String(heroFocalY.value)
    );
  } catch (err) {
    console.warn("[settings] failed to persist image focus:", err);
  }
};

const onHeroImageLoad = (event: Event) => {
  const image = event.target as HTMLImageElement | null;
  const width = Number(image?.naturalWidth || 0);
  const height = Number(image?.naturalHeight || 0);
  if (!width || !height) {
    heroAspectRatio.value = 1;
    return;
  }
  heroAspectRatio.value = width / height;
};

const hasCarousel = computed(() => photoSlots.value.some((slot) => !!slot));

const setHeroFromOption = (option: CarouselOption) => {
  const url = option?.url || "";
  if (!url) return;
  selectedImage.value = url;
  loadHeroFocalY(url);
  persistHeroFocalY();
  if (option?.source === "library" && option.photoId) {
    emit("updateAvatarUrl", {
      source: "library",
      photoId: option.photoId,
      url,
    });
    return;
  }
  emit("updateAvatarUrl", url);
};

const scrollThumbs = (direction: number) => {
  const container = thumbsRef.value;
  if (!container) return;
  const step = 68;
  container.scrollTo({
    left: container.scrollLeft + step * direction,
    behavior: "smooth",
  });
};

const loadGenderAvatarOptions = async () => {
  const genderId = Number(props.userProfile?.gender_id || 3);
  loadingGenderOptions.value = true;
  try {
    const res = await $fetch("/api/profile/avatar-random-options", {
      query: { genderId, limit: 200 },
    });
    const avatars = Array.isArray((res as any)?.avatars) ? (res as any).avatars : [];
    genderAvatarOptions.value = avatars.filter(Boolean);

    if (!previewAvatar.value && avatars.length) {
      const randomChoice =
        (res as any)?.selectedAvatar ||
        avatars[Math.floor(Math.random() * avatars.length)] ||
        "";
      if (randomChoice) {
        selectedImage.value = randomChoice;
        emit("updateAvatarUrl", randomChoice);
      }
    }
  } catch (err) {
    console.warn("[settings] load gender avatar options failed:", err);
    genderAvatarOptions.value = [];
  } finally {
    loadingGenderOptions.value = false;
  }
};

watch(
  () => props.avatarUrl,
  () => {
    selectedImage.value = "";
  }
);

watch(
  () => heroImage.value,
  (url) => {
    heroAspectRatio.value = 1;
    loadHeroFocalY(url || "");
  },
  { immediate: true }
);

watch(
  () => props.userProfile?.gender_id,
  () => {
    loadGenderAvatarOptions();
  }
);

onMounted(() => {
  loadGenderAvatarOptions();
});

const triggerFilePicker = () => {
  if (fileInput.value) {
    fileInput.value.value = "";
    fileInput.value.click();
  }
};

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    emit("uploadAvatar", file);
  }
};
</script>

<style scoped>
.profile-photo-card {
  width: 360px;
  max-width: 100%;
  min-height: 296px;
  overflow: visible;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 16px;
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.98),
    rgb(var(--color-surface-elevated) / 0.94)
  );
  box-shadow: 0 14px 32px rgb(var(--color-shadow) / 0.08);
}

.profile-photo-card--editing {
  border-color: rgb(var(--color-secondary) / 0.38);
  box-shadow:
    0 18px 36px rgb(var(--color-shadow) / 0.12),
    0 0 0 1px rgb(var(--color-secondary) / 0.16);
}

.profile-photo-card--readonly {
  background: rgb(var(--color-surface) / 0.94);
}

.photo-hero {
  position: relative;
  height: 160px;
  background: #101010;
}

.photo-hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-avatar-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  pointer-events: none;
  z-index: 2;
}

.photo-hero-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1c1c1c, #2a2a2a);
}

.photo-hero-placeholder__icon {
  font-size: 40px;
  color: rgb(226 232 240 / 0.7);
}

.photo-hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  background: linear-gradient(180deg, rgb(0 0 0 / 0) 30%, rgb(0 0 0 / 0.75) 100%);
}

.photo-hero-controls {
  position: absolute;
  top: 8px;
  right: 8px;
  display: inline-flex;
  gap: 6px;
  z-index: 3;
}

.photo-control-btn {
  width: 1.95rem;
  height: 1.95rem;
  background: rgb(var(--color-surface) / 0.32);
  color: rgb(var(--color-heading));
}

.photo-control-btn:disabled {
  background: rgb(var(--color-surface) / 0.2);
}

.photo-control-btn__spinner {
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: photo-control-spin 0.7s linear infinite;
}

.photo-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  color: #fff;
  font-size: 0.95rem;
  white-space: nowrap;
}

.photo-name {
  font-weight: 600;
}

.photo-tagline {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-dot {
  color: rgb(255 255 255 / 0.6);
}

.photo-link {
  display: inline-flex;
  align-items: center;
  color: inherit;
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
  max-width: 260px;
  margin: 0 auto;
  overflow-x: auto;
  padding-bottom: 2px;
}

.photo-library-chevron {
  position: absolute;
  top: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  transform: translateY(-50%);
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 999px;
  background: rgb(var(--color-surface) / 0.94);
  color: rgb(var(--color-foreground));
}

.photo-library-chevron.left {
  left: -8px;
}

.photo-library-chevron.right {
  right: -8px;
}

.photo-library-chevron:disabled {
  opacity: 0.5;
  cursor: default;
}

.photo-library-slot {
  flex: 0 0 64px;
}

.photo-library-skeleton {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  background: rgb(var(--color-foreground) / 0.12);
}

.photo-library-thumb {
  position: relative;
  overflow: hidden;
  width: 64px;
  height: 64px;
  padding: 0;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 10px;
  background: rgb(var(--color-surface));
  cursor: pointer;
}

.photo-library-thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-library-thumb--active {
  border-color: rgb(var(--color-primary));
  box-shadow: 0 0 0 1px rgb(var(--color-primary) / 0.35);
}

.photo-status-alert {
  margin-top: 0.5rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.85rem;
}

.photo-status-alert--error {
  background: rgb(var(--color-danger) / 0.1);
  border-color: rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}

.photo-lookingfor {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 44px;
  padding: 10px 12px 14px;
  border-top: 1px solid rgb(var(--color-border) / 0.52);
}

.menu-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.lookingfor-disabled {
  opacity: 1;
  border: 1px solid rgb(var(--color-border) / 0.58);
  border-radius: 10px;
  background: rgb(var(--color-surface) / 0.52);
}

.lookingfor-icons {
  display: flex;
  justify-content: center;
  min-width: 120px;
  filter: saturate(1.15);
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

:deep(.text-link-btn) {
  color: rgb(var(--color-primary));
}

@keyframes photo-control-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
