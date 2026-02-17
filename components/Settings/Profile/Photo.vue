<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <v-card class="profile-photo-card" elevation="0" variant="outlined">
        <div class="photo-hero">
          <NuxtImg
            v-if="heroImage"
            :src="heroImage"
            class="photo-hero-image"
            alt="Profile Image"
          />
          <div v-else class="photo-hero-placeholder">
            <v-icon size="40" color="grey-lighten-2">mdi-account</v-icon>
          </div>
          <div v-if="editable" class="photo-hero-controls">
            <v-tooltip text="Random photo" location="bottom">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon
                  size="x-small"
                  variant="tonal"
                  class="photo-control-btn"
                  :loading="randomLoading"
                  :disabled="randomLoading"
                  @click="$emit('randomAvatar')"
                >
                  <v-icon size="14">mdi-dice-5-outline</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <v-tooltip text="Upload photo" location="bottom">
              <template #activator="{ props: tooltipProps }">
                <v-btn
                  v-bind="tooltipProps"
                  icon
                  size="x-small"
                  variant="tonal"
                  class="photo-control-btn"
                  :loading="uploadLoading"
                  :disabled="uploadLoading"
                  @click="triggerFilePicker"
                >
                  <v-icon size="14">mdi-upload</v-icon>
                </v-btn>
              </template>
            </v-tooltip>
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              @change="onFileChange"
            />
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
                <v-icon size="18" color="white">mdi-link-variant</v-icon>
              </a>
            </div>
          </div>
        </div>

        <div class="photo-library-body">
          <div class="photo-library-strip-wrap">
            <v-btn
              icon
              variant="text"
              size="small"
              class="photo-library-chevron left"
              :disabled="loadingGenderOptions || !hasCarousel"
              @click="scrollThumbs(-1)"
            >
              <v-icon size="18">mdi-chevron-left</v-icon>
            </v-btn>
            <div ref="thumbsRef" class="photo-library-strip">
              <div
                v-for="(item, idx) in photoSlots"
                :key="`${item || 'slot'}-${idx}`"
                class="photo-library-slot"
              >
                <template v-if="item">
                  <v-card
                    variant="outlined"
                    class="photo-library-thumb"
                    :class="{ 'photo-library-thumb--active': item === heroImage }"
                    @click="setHeroFromImage(item)"
                  >
                    <NuxtImg :src="item" class="photo-library-thumb-image" alt="Photo option" />
                  </v-card>
                </template>
                <div v-else class="photo-library-skeleton" />
              </div>
            </div>
            <v-btn
              icon
              variant="text"
              size="small"
              class="photo-library-chevron right"
              :disabled="loadingGenderOptions || !hasCarousel"
              @click="scrollThumbs(1)"
            >
              <v-icon size="18">mdi-chevron-right</v-icon>
            </v-btn>
          </div>
          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2 mb-0"
          >
            {{ errorMessage }}
          </v-alert>
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
      </v-card>
    </v-col>
  </v-row>
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
  refreshLookingForMenu: { type: Boolean, default: false },
  displayKey: { type: Number, default: 0 },
});

const emit = defineEmits([
  "updateAvatarUrl",
  "randomAvatar",
  "uploadAvatar",
  "lookingForUpdated",
]);
const fileInput = ref<HTMLInputElement | null>(null);

const previewAvatar = computed(() => {
  return props.avatarUrl || "";
});
const thumbsRef = ref<HTMLElement | null>(null);
const selectedImage = ref("");

const normalizedLibraryPhotos = computed(() =>
  (Array.isArray(props.photoLibraryPhotos) ? props.photoLibraryPhotos : [])
    .map((item: any) => item?.url || item?.public_url || "")
    .filter((url: string) => !!url)
);
const genderAvatarOptions = ref<string[]>([]);
const loadingGenderOptions = ref(false);

const photoSlots = computed(() => {
  const list = [];
  if (previewAvatar.value) list.push(previewAvatar.value);
  for (const url of genderAvatarOptions.value) {
    if (!list.includes(url)) list.push(url);
  }
  for (const url of normalizedLibraryPhotos.value) {
    if (!list.includes(url)) list.push(url);
  }
  return list;
});

const heroImage = computed(() => {
  if (selectedImage.value) return selectedImage.value;
  if (previewAvatar.value) return previewAvatar.value;
  if (genderAvatarOptions.value.length) return genderAvatarOptions.value[0];
  return normalizedLibraryPhotos.value[0] || "";
});

const hasCarousel = computed(() => photoSlots.value.some((slot) => !!slot));

const setHeroFromImage = (url: string) => {
  if (!url) return;
  selectedImage.value = url;
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

    // If no avatar is currently set, randomly preselect one from the same pool
    // used by the random-avatar endpoint so the profile starts with a valid option.
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
  border-radius: 14px;
  overflow: visible;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
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

.photo-hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1c1c1c, #2a2a2a);
}

.photo-hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.75) 100%);
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
  background: rgba(15, 23, 42, 0.55) !important;
  color: #cbd5e1 !important;
  border: 1px solid rgba(203, 213, 225, 0.35);
}

.photo-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
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
  color: rgba(255, 255, 255, 0.6);
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
  overflow-x: auto;
  padding-bottom: 2px;
  max-width: 260px;
  margin: 0 auto;
}

.photo-library-chevron {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(var(--v-theme-surface), 0.9);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.2);
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
  background: rgba(var(--v-theme-on-surface), 0.12);
}

.photo-library-thumb {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  width: 64px;
  height: 64px;
  cursor: pointer;
}

.photo-library-thumb-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-library-thumb--active {
  border-color: rgba(var(--v-theme-primary), 0.75) !important;
}

.photo-lookingfor {
  position: relative;
  z-index: 2;
  padding: 10px 12px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.06);
  min-height: 44px;
}

.menu-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.lookingfor-disabled {
  opacity: 0.6;
}

.lookingfor-icons {
  min-width: 120px;
  display: flex;
  justify-content: center;
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
  color: rgb(var(--v-theme-primary));
}
</style>
