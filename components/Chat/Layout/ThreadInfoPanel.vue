<template>
  <div
    v-if="panelOpen"
    id="thread-info-panel"
    class="mx-1 thread-info-panel-card"
    :aria-hidden="String(!panelOpen)"
  >
    <div class="px-4 py-4">
      <template v-if="selectedUser">
        <div
          v-if="selectedUserLocalized.tagline"
          :class="[
            'mb-3 text-base italic profile-tagline',
            {
              truncate: !mobile || smAndDown,
            },
          ]"
          :title="selectedUserLocalized.tagline"
        >
          "{{ selectedUserLocalized.tagline }}"
        </div>

        <div v-if="selectedUserMeta.length" class="profile-meta-grid mb-3 text-sm">
          <div
            v-if="selectedUserPrimaryMetaItems.length"
            class="profile-meta-primary-row mb-2 flex flex-wrap items-center"
          >
            <div
              v-for="item in selectedUserPrimaryMetaItems"
              :key="item.key"
              class="profile-meta-primary-item flex items-center"
            >
              <i
                :class="[
                  ...iconClass(item.icon, 'meta-icon mr-2 text-[18px]'),
                  'text-current',
                  item.color ? '' : 'text-medium-emphasis',
                ]"
                aria-hidden="true"
                :style="item.color ? { color: item.color } : undefined"
              />
              <span class="mr-1 profile-meta-label">
                {{ item.label }}:
              </span>
              <span class="profile-meta-value">
                <template v-if="item.key === 'gender'">
                  {{ item.value }}
                  <button
                    class="profile-photo-count-link"
                    type="button"
                    :disabled="!selectedUserPhotoCount"
                    @click.stop="$emit('open-photos')"
                  >
                    ({{ selectedUserPhotoCountLabel }})
                  </button>
                </template>
                <template v-else>{{ item.value }}</template>
              </span>
            </div>
          </div>
          <div
            v-for="item in selectedUserSecondaryMetaItems"
            :key="item.key"
            class="mb-2 flex items-center"
          >
            <i
              :class="[
                ...iconClass(item.icon, 'meta-icon mr-2 text-[18px]'),
                'text-current',
                item.color ? '' : 'text-medium-emphasis',
              ]"
              aria-hidden="true"
              :style="item.color ? { color: item.color } : undefined"
            />
            <span class="mr-1 profile-meta-label">
              {{ item.label }}:
            </span>
            <span
              class="profile-meta-value"
              :class="{ truncate: mobile && smAndDown }"
            >
              {{ item.value }}
            </span>
          </div>
        </div>

        <div v-if="selectedUserPanelView === 'photos'" class="profile-photo-view mb-3">
          <div class="mb-2 flex items-center justify-between">
            <span class="profile-meta-label text-xs">
              {{ selectedUserPhotoCount }} photos
            </span>
            <button
              type="button"
              class="profile-photo-back-btn"
              :title="t('components.chatheader.back-to-bio')"
              :aria-label="t('components.chatheader.back-to-bio')"
              @click="$emit('view-bio')"
            >
              <i
                :class="iconClass('mdi-arrow-left-circle-outline', 'text-xl')"
                aria-hidden="true"
              />
            </button>
          </div>
          <div
            v-if="selectedUserPhotosLoading"
            class="profile-photo-skeleton"
            aria-hidden="true"
          />
          <div
            v-else-if="selectedUserPhotoSlides.length"
            class="profile-photo-carousel-wrap"
            :class="{ 'is-locked': shouldBlurSelectedUserPhotos }"
          >
            <div class="profile-photo-stage">
              <template v-if="currentPhoto">
                <img
                  v-if="currentPhoto.url"
                  :src="currentPhoto.url"
                  alt=""
                  class="profile-photo-image"
                >
                <div v-else class="profile-photo-fallback">
                  No photo preview
                </div>
              </template>
              <div
                v-else
                class="profile-photo-fallback"
              >
                No photo preview
              </div>

              <button
                v-if="hasMultiplePhotos"
                type="button"
                class="profile-photo-nav profile-photo-nav--prev"
                :disabled="!canShowPreviousPhoto"
                title="Previous photo"
                aria-label="Previous photo"
                @click.stop="showPreviousPhoto"
              >
                <i
                  :class="iconClass('mdi-chevron-left', 'text-xl')"
                  aria-hidden="true"
                />
              </button>

              <button
                v-if="hasMultiplePhotos"
                type="button"
                class="profile-photo-nav profile-photo-nav--next"
                :disabled="!canShowNextPhoto"
                title="Next photo"
                aria-label="Next photo"
                @click.stop="showNextPhoto"
              >
                <i
                  :class="iconClass('mdi-chevron-right', 'text-xl')"
                  aria-hidden="true"
                />
              </button>

              <div
                v-if="hasMultiplePhotos"
                class="profile-photo-counter"
                aria-live="polite"
              >
                {{ activeSlideIndex + 1 }} / {{ selectedUserPhotoSlides.length }}
              </div>
            </div>
            <div
              v-if="shouldBlurSelectedUserPhotos"
              class="profile-photo-lock-overlay"
            >
              <i
                :class="iconClass('mdi-lock', 'mr-1 text-[18px]')"
                aria-hidden="true"
              />
              <button
                type="button"
                class="profile-photo-lock-link"
                @click.stop="$emit('open-photo-access')"
              >
                {{ lockedPhotoCtaLabel }}
              </button>
            </div>
          </div>
          <div v-else class="text-sm text-medium-emphasis">
            No approved photos yet.
          </div>
        </div>
        <div
          v-else-if="selectedUserLocalized.bio"
          class="profile-bio mb-3 text-sm"
        >
          {{ selectedUserLocalized.bio }}
        </div>

        <div v-if="selectedUserInterests.length" class="profile-looking-for-row mb-3">
          <span
            v-for="interest in selectedUserInterests"
            :key="interest"
            class="profile-looking-for-chip"
            :style="getLookingForChipStyle(interest)"
          >
            {{ interest }}
          </span>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            class="profile-view-btn"
            title="View full profile"
            @click="$emit('open-profile')"
          >
            <i
              :class="iconClass('mdi-account-box-outline', 'mr-1 text-[18px]')"
              aria-hidden="true"
            />
            View full profile
          </button>
          <div class="ml-auto flex items-center gap-2">
            <ButtonUpvote :profile="selectedUser" />
            <span :title="t('components.chatheader.favorite-profile')">
              <ButtonFavorite :profile="selectedUser" />
            </span>
            <button
              type="button"
              class="profile-action-btn profile-action-btn--block"
              :disabled="isBlockDisabled"
              :title="blockTooltip"
              aria-label="Block user"
              @click="$emit('toggle-block')"
            >
              <i
                :class="iconClass('mdi-cancel', 'text-[18px]')"
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              class="profile-action-btn profile-action-btn--share"
              :disabled="!profileLink"
              :title="t('components.chatheader.share-profile')"
              aria-label="Share profile"
              @click="$emit('share-profile')"
            >
              <i
                :class="iconClass('mdi-share-variant', 'text-[18px]')"
                aria-hidden="true"
              />
            </button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="profile-empty-state text-sm">
          Select a user to view profile details.
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
const { t } = useI18n();

const props = defineProps({
  mobile: { type: Boolean, default: false },
  panelOpen: { type: Boolean, default: false },
  selectedUser: { type: Object, default: null },
  selectedUserLocalized: { type: Object, default: () => ({}) },
  selectedUserMeta: { type: Array, default: () => [] },
  selectedUserPrimaryMetaItems: { type: Array, default: () => [] },
  selectedUserSecondaryMetaItems: { type: Array, default: () => [] },
  smAndDown: { type: Boolean, default: false },
  selectedUserPanelView: { type: String, default: "bio" },
  selectedUserPhotoCount: { type: Number, default: 0 },
  selectedUserPhotoCountLabel: { type: String, default: "" },
  selectedUserPhotosLoading: { type: Boolean, default: false },
  selectedUserPhotoSlides: { type: Array, default: () => [] },
  shouldBlurSelectedUserPhotos: { type: Boolean, default: false },
  lockedPhotoCtaLabel: { type: String, default: "" },
  selectedUserInterests: { type: Array, default: () => [] },
  getLookingForChipStyle: { type: Function, default: () => () => ({}) },
  blockTooltip: { type: String, default: "" },
  isSelectedUserBlocked: { type: Boolean, default: false },
  isBlockDisabled: { type: Boolean, default: false },
  profileLink: { type: String, default: "" },
});

defineEmits([
  "open-photos",
  "view-bio",
  "open-photo-access",
  "open-profile",
  "toggle-block",
  "share-profile",
]);

const iconClass = (icon, extra = "") => ["mdi", icon, extra].filter(Boolean);

const activeSlideIndex = ref(0);

const hasMultiplePhotos = computed(() => props.selectedUserPhotoSlides.length > 1);

const currentPhoto = computed(
  () => props.selectedUserPhotoSlides[activeSlideIndex.value] || null
);

const canShowPreviousPhoto = computed(() => activeSlideIndex.value > 0);

const canShowNextPhoto = computed(
  () => activeSlideIndex.value < props.selectedUserPhotoSlides.length - 1
);

const resetActiveSlide = () => {
  activeSlideIndex.value = 0;
};

const showPreviousPhoto = () => {
  if (!canShowPreviousPhoto.value) return;
  activeSlideIndex.value -= 1;
};

const showNextPhoto = () => {
  if (!canShowNextPhoto.value) return;
  activeSlideIndex.value += 1;
};

watch(
  () => props.selectedUserPanelView,
  () => {
    resetActiveSlide();
  }
);

watch(
  () => props.selectedUser?.user_id || props.selectedUser?.id || "",
  () => {
    resetActiveSlide();
  }
);

watch(
  () => props.selectedUserPhotoSlides.length,
  (length) => {
    if (!length) {
      resetActiveSlide();
      return;
    }
    if (activeSlideIndex.value > length - 1) {
      activeSlideIndex.value = length - 1;
    }
  }
);
</script>

<style scoped>
.profile-meta-grid {
  column-gap: 24px;
}

.profile-meta-primary-row {
  gap: 18px;
}

.profile-meta-primary-item {
  min-width: 0;
}

.profile-photo-count-link,
.profile-photo-back-link {
  border: 0;
  background: transparent;
  color: #7cc2ff;
  cursor: pointer;
  padding: 0;
  margin-left: 4px;
  text-decoration: underline;
}

.profile-photo-count-link:disabled {
  opacity: 0.5;
  cursor: default;
  text-decoration: none;
}

.profile-photo-back-btn {
  color: #7cc2ff !important;
  opacity: 0.9;
  width: 2rem;
  height: 2rem;
  border: 0;
  background: transparent;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.profile-photo-back-btn:hover {
  opacity: 1;
}

.profile-photo-view {
  position: relative;
}

.profile-photo-skeleton {
  height: 210px;
  border-radius: 12px;
  overflow: hidden;
  background: linear-gradient(
    90deg,
    rgba(30, 41, 59, 0.45) 0%,
    rgba(51, 65, 85, 0.72) 50%,
    rgba(30, 41, 59, 0.45) 100%
  );
  background-size: 200% 100%;
  animation: profile-photo-skeleton-shimmer 1.4s ease-in-out infinite;
}

.profile-photo-carousel-wrap {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.32);
}

.profile-photo-stage {
  position: relative;
  height: 210px;
}

.profile-photo-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-photo-fallback {
  height: 210px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.75);
}

.profile-photo-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.18s ease, background 0.18s ease;
}

.profile-photo-carousel-wrap:hover .profile-photo-nav,
.profile-photo-nav:focus-visible {
  opacity: 1;
}

.profile-photo-nav:hover:not(:disabled) {
  background: rgba(30, 41, 59, 0.88);
}

.profile-photo-nav:disabled {
  opacity: 0.4 !important;
  cursor: default;
}

.profile-photo-nav--prev {
  left: 0.5rem;
}

.profile-photo-nav--next {
  right: 0.5rem;
}

.profile-photo-counter {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  padding: 0.2rem 0.55rem;
  background: rgba(2, 6, 23, 0.7);
  color: #e2e8f0;
  font-size: 0.75rem;
  line-height: 1rem;
}

.profile-photo-carousel-wrap.is-locked .profile-photo-image,
.profile-photo-carousel-wrap.is-locked .profile-photo-fallback,
.profile-photo-carousel-wrap.is-locked .profile-photo-nav,
.profile-photo-carousel-wrap.is-locked .profile-photo-counter {
  filter: blur(10px);
  transform: scale(1.02);
}

.profile-photo-lock-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e2e8f0;
  font-weight: 600;
  background: rgba(2, 6, 23, 0.38);
  gap: 6px;
  pointer-events: none;
}

.profile-photo-lock-link {
  pointer-events: auto;
  border: 0;
  background: transparent;
  color: #e2e8f0;
  font-weight: 600;
  text-decoration: underline;
  cursor: pointer;
  padding: 0;
}

.meta-icon {
  position: relative;
  top: -2px;
}

.profile-bio {
  white-space: pre-line;
  color: #cbd5e1;
}

.profile-looking-for-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.profile-looking-for-chip {
  display: inline-flex;
  align-items: center;
  border-width: 1px;
  border-style: solid;
  border-radius: 999px;
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--profile-looking-for-color, #818cf8) !important;
  background: var(--profile-looking-for-bg, rgba(129, 140, 248, 0.14)) !important;
  border-color: var(--profile-looking-for-border, rgba(129, 140, 248, 0.5)) !important;
  font-weight: 500;
}

.thread-info-panel-card {
  background: #0f172a !important;
  border: 1px solid rgba(148, 163, 184, 0.45) !important;
  color: #e2e8f0 !important;
  border-radius: 0.75rem;
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.28);
}

.profile-tagline {
  color: #e2e8f0 !important;
}

.profile-meta-label {
  color: #94a3b8 !important;
}

.profile-meta-value {
  color: #e2e8f0 !important;
}

.profile-view-btn {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(96, 165, 250, 0.24);
  border-radius: 999px;
  padding: 0.4rem 0.85rem;
  font-size: 0.875rem;
  font-weight: 500;
  background: rgba(59, 130, 246, 0.18) !important;
  color: #dbeafe !important;
}

.profile-action-btn {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.42);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.92;
}

.profile-action-btn:hover:not(:disabled),
.profile-view-btn:hover:not(:disabled),
.profile-photo-back-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.profile-action-btn:disabled,
.profile-view-btn:disabled,
.profile-photo-back-btn:disabled {
  opacity: 0.55;
  cursor: default;
}

.profile-action-btn--block :deep(.mdi) {
  color: #60a5fa !important;
}

.profile-action-btn--share :deep(.mdi) {
  color: #93c5fd !important;
}

.profile-empty-state {
  color: #94a3b8 !important;
}

@keyframes profile-photo-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
