<template>
  <v-row no-gutters justify="center">
    <v-col
      cols="12"
      :md="showPhotoLibrary ? 6 : 12"
      class="d-flex flex-column align-center"
    >
      <!-- {{ isEditable ? "Edit Mode" : "View Mode" }} -->
      <SettingsProfilePhoto
        :editable="isEditable"
        :userId="userProfile.user_id"
        :avatarUrl="avatar"
        :randomLoading="randomLoading"
        :uploadLoading="uploadLoading"
        :errorMessage="errorMessage"
        :userProfile="userProfile"
        :refreshLookingForMenu="refreshLookingForMenu"
        :displayKey="displayKey"
        @updateAvatarUrl="$emit('updateAvatarUrl', $event)"
        @randomAvatar="$emit('randomAvatar')"
        @uploadAvatar="$emit('uploadAvatar', $event)"
        @lookingForUpdated="$emit('refreshLookingForDisplay')"
      />
    </v-col>
    <v-col
      v-if="showPhotoLibrary"
      cols="12"
      md="6"
      class="d-flex flex-column align-center mt-4 mt-md-0"
    >
      <v-card
        class="photo-library-card"
        :class="{ 'photo-library-card--disabled': photoLibraryDisabled }"
        elevation="1"
      >
        <div class="photo-library-hero">
          <v-skeleton-loader
            v-if="photoLibraryDisabled"
            type="image"
            class="photo-library-hero-skeleton"
          />
          <template v-else>
            <v-img
              v-if="heroPhoto"
              :src="heroPhoto"
              class="photo-library-hero-image"
              cover
            />
            <div v-else class="photo-library-hero-placeholder">
              <v-icon size="40" color="grey-lighten-2">mdi-image-multiple</v-icon>
            </div>
          </template>
        </div>
        <v-card-text class="photo-library-body">
          <div class="photo-library-strip-wrap">
            <v-btn
              icon
              variant="text"
              size="small"
              class="photo-library-chevron left"
              :disabled="photoLibraryDisabled"
              @click="scrollThumbs(-1)"
            >
              <v-icon size="18">mdi-chevron-left</v-icon>
            </v-btn>
            <div ref="thumbsRef" class="photo-library-strip">
              <div
                v-for="(item, idx) in photoSlots"
                :key="idx"
                class="photo-library-slot"
              >
                <template v-if="!photoLibraryDisabled && item">
                  <v-card
                    variant="outlined"
                    class="photo-library-thumb"
                    @click="setHeroFromIndex(idx)"
                  >
                    <v-img
                      :src="item.url || item.public_url"
                      aspect-ratio="1"
                      cover
                    />
                  </v-card>
                </template>
                <v-skeleton-loader type="image" class="photo-library-skeleton" />
              </div>
            </div>
            <v-btn
              icon
              variant="text"
              size="small"
              class="photo-library-chevron right"
              :disabled="photoLibraryDisabled"
              @click="scrollThumbs(1)"
            >
              <v-icon size="18">mdi-chevron-right</v-icon>
            </v-btn>
          </div>
        </v-card-text>
        <div class="photo-library-footer">
          <v-btn
            variant="text"
            append-icon="mdi-arrow-expand-right"
            color="blue"
            :disabled="photoLibraryDisabled"
            @click="$emit('openPhotoLibrary')"
          >
            {{ t("components.photo-library.link") }}
          </v-btn>
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
      </v-card>
    </v-col>
  </v-row>
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

const heroPhoto = computed(() => {
  const items = Array.isArray(props.photoLibraryPhotos)
    ? props.photoLibraryPhotos
    : [];
  if (!items.length) return "";
  const item = items[heroIndex.value % items.length];
  return item?.url || item?.public_url || "";
});

const setHeroFromIndex = (idx) => {
  if (props.photoLibraryDisabled) return;
  const items = Array.isArray(props.photoLibraryPhotos)
    ? props.photoLibraryPhotos
    : [];
  if (!items[idx]) return;
  heroIndex.value = idx;
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
  },
  { immediate: true }
);
</script>

<style scoped>
:deep(.profile-photo-card) {
  width: 100%;
  max-width: 360px;
}

.photo-library-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 360px;
  min-height: 296px;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.photo-library-card--disabled {
  opacity: 0.7;
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
}

.photo-library-hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1c1c1c, #2a2a2a);
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
  background: rgba(255, 255, 255, 0.85);
}

.photo-library-chevron.left {
  left: 0;
}

.photo-library-chevron.right {
  right: 0;
}

.photo-library-slot {
  flex: 0 0 64px;
}

.photo-library-skeleton {
  width: 64px;
  height: 64px;
  border-radius: 10px;
}

.photo-library-thumb {
  position: relative;
  overflow: hidden;
  border-radius: 10px;
  width: 64px;
  height: 64px;
  cursor: pointer;
}

.photo-library-footer {
  margin-top: auto;
  display: flex;
  justify-content: flex-start;
  padding: 8px 12px 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  min-height: 44px;
  align-items: center;
  gap: 8px;
}

.photo-library-link {
  letter-spacing: 0.02em;
}

.photo-library-hint {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
}

.photo-library-hint-link {
  cursor: pointer;
  text-decoration: underline;
}
</style>
