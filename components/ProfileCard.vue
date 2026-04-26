<template>
  <article
    v-if="profile"
    :class="['profile-card', `profile-card--${resolvedCardTheme}`]"
    :style="{ maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }"
  >
    <div class="profile-card-glow" />
    <slot name="overlay" />
    <div v-if="!hasOverlaySlot" class="profile-card-rarity">Profile Card</div>
    <div class="profile-card-header">
      <div class="profile-card-hero">
        <div class="avatar-wrapper">
          <img
            :src="profileAvatarSrc"
            width="112"
            height="112"
            class="profile-avatar-image"
            :alt="`${localized.displayname} image`"
            @error="onAvatarError"
          >

          <img
            v-if="avatarDecoration"
            :src="avatarDecoration"
            class="avatar-decoration"
            :alt="`${localized.displayname} image decoration`"
          >
        </div>

        <div class="profile-identity">
          <div class="profile-title-row">
            <h1 id="profile-dialog-title" class="profile-title">
              {{ localized.displayname }}
            </h1>
          </div>

          <div class="profile-stats-strip">
            <div v-if="profile?.age" class="profile-stat-pill">
              <i
                v-if="profile?.gender_id"
                :class="['mdi', getAvatarIcon(profile.gender_id), 'gender-inline']"
                :style="{ '--profile-gender-color': getGenderHexColor(profile.gender_id) }"
                aria-hidden="true"
              />
              <span>{{ profile.age }}{{ $t("components.profile-details.age-suffix") }}</span>
            </div>
            <div v-if="profile?.status" class="profile-stat-pill">
              {{ profile.status }}
            </div>
            <div
              v-if="defaultLanguageLabel"
              class="profile-stat-pill"
              :title="$t('components.profile-language.default')"
            >
              <i class="mdi mdi-translate profile-stat-icon" aria-hidden="true" />
              <span>{{ defaultLanguageLabel }}</span>
            </div>
            <div
              v-if="lookingForUserId"
              class="profile-stat-pill profile-stat-pill--looking-for"
              :aria-label="$t('components.public-user-profile.looking-for')"
            >
              <SettingsProfileLookingForDisplay
                :user-id="lookingForUserId"
                :icon-size="13"
              />
            </div>
            <div
              v-else-if="lookingForLabel"
              class="profile-stat-pill profile-stat-pill--icon-only"
              :title="`${$t('components.public-user-profile.looking-for')} ${lookingForLabel}`"
              :aria-label="`${$t('components.public-user-profile.looking-for')} ${lookingForLabel}`"
            >
              <i class="mdi mdi-account-search-outline profile-stat-icon" aria-hidden="true" />
            </div>
            <div
              v-if="profile?.country_emoji"
              class="profile-stat-pill profile-stat-pill--flag"
              :title="profile?.country || undefined"
            >
              <span class="profile-flag">
                {{ profile.country_emoji }}
              </span>
            </div>
          </div>

          <p v-if="localized.tagline" class="profile-tagline-inline">
            {{ localized.tagline }}
          </p>

          <NuxtLink
            :to="chatLink"
            rel="nofollow"
            class="profile-chat-cta"
            @click="emit('chat-now')"
          >
            {{ $t("components.profile-details.chat-cta", { name: localized.displayname }) }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <section v-if="localized.bio" class="profile-details profile-details--always-open">
      <div class="profile-details-about">
        <i class="mdi mdi-account-details-outline profile-details-about__icon" aria-hidden="true" />
        <div class="profile-details-row profile-details-row--stack">
          <span class="profile-details-label">
            {{ $t("components.public-user-profile.about-me") }}
          </span>
          <span class="profile-details-body">
            {{ localized.bio }}
          </span>
        </div>
      </div>
    </section>

    <div class="profile-panels">
      <section class="profile-panel">
        <button
          type="button"
          class="profile-panel-title"
          :aria-expanded="isSectionExpanded('gallery')"
          @click="toggleSection('gallery')"
        >
          <span>{{ $t("components.profile-gallery.title", { count: galleryCount }) }}</span>
          <i
            :class="[
              'mdi',
              isSectionExpanded('gallery') ? 'mdi-chevron-up' : 'mdi-chevron-down',
              'profile-panel-title__icon',
            ]"
            aria-hidden="true"
          />
        </button>
        <div v-if="isSectionExpanded('gallery')" class="profile-panel-body profile-gallery">
          <template v-if="galleryDisplayItems.length">
            <div class="profile-gallery-strip">
              <div
                v-for="item in galleryDisplayItems"
                :key="item.id || item.storage_path || item.public_url || item._placeholderId"
                class="profile-gallery-item"
                :class="{ 'profile-gallery-item--blurred': galleryBlurred }"
              >
                <div
                  class="profile-gallery-thumb-wrap"
                  :class="{ 'profile-gallery-thumb-wrap--clickable': !galleryBlurred && (item.url || item.public_url) }"
                  @click.stop="!galleryBlurred && openLightbox(item)"
                >
                  <img
                    v-if="item.url || item.public_url"
                    :src="item.url || item.public_url"
                    class="profile-gallery-thumb"
                    alt=""
                  >
                  <div v-else class="profile-gallery-placeholder" />
                </div>
                <div
                  v-if="!galleryBlurred && (item.url || item.public_url)"
                  class="profile-gallery-vote"
                >
                  <button
                    type="button"
                    class="profile-gallery-like"
                    :class="{ 'profile-gallery-like--active': item.myVote === 1 }"
                    @click.stop="emit('likePhoto', item)"
                  >
                    <i class="mdi mdi-thumb-up-outline" aria-hidden="true" />
                  </button>
                  <span class="profile-gallery-like-count">
                    {{ item.upvotes ?? 0 }}
                  </span>
                </div>
              </div>
            </div>
            <div
              v-if="galleryBlurred"
              class="profile-gallery-signin"
            >
              <NuxtLink :to="localPath('/signin')">
                {{ $t("components.profile-gallery.signin") }}
              </NuxtLink>
            </div>
          </template>
          <div v-else class="profile-gallery-empty">
            {{ $t("components.profile-gallery.empty") }}
          </div>
        </div>
      </section>

      <section class="profile-panel">
        <button
          type="button"
          class="profile-panel-title"
          :aria-expanded="isSectionExpanded('stats')"
          @click="toggleSection('stats')"
        >
          <span>{{ $t("components.profile-stats.title") }}</span>
          <i
            :class="[
              'mdi',
              isSectionExpanded('stats') ? 'mdi-chevron-up' : 'mdi-chevron-down',
              'profile-panel-title__icon',
            ]"
            aria-hidden="true"
          />
        </button>
        <div v-if="isSectionExpanded('stats')" class="profile-panel-body profile-stats">
          <div class="profile-stats-item">
            <i class="mdi mdi-clock-outline profile-stats-item__icon" aria-hidden="true" />
            <div class="profile-stats-item__content">
              <div class="profile-stats-item__label">
                {{ $t('components.profile-stats.last-connection') }}
              </div>
              <div class="profile-stats-item__value">
                {{ lastConnectionLabel }}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="profile-card-actions">
      <a
        v-if="profileSiteUrl"
        :href="profileSiteUrl"
        class="profile-action-btn"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="
          $t('components.public-user-profile.visit1') +
          `${localized.displayname}` +
          $t('components.public-user-profile.visit2')
        "
      >
        <i class="mdi mdi-link-variant" aria-hidden="true" />
      </a>
      <button
        v-else
        type="button"
        class="profile-action-btn"
        disabled
      >
        <i class="mdi mdi-link-variant-off" aria-hidden="true" />
      </button>
      <div class="profile-card-actions__spacer" />

      <ButtonUpvote :profile="profile" @upvoted="emit('upvoted', $event)" />

      <NuxtLink
        :to="chatLink"
        class="profile-action-btn"
        @click="emit('chat-now')"
      >
        <i class="mdi mdi-chat-outline" aria-hidden="true" />
      </NuxtLink>

      <ButtonFavorite :profile="profile" />

      <button type="button" class="profile-action-btn" disabled>
        <i class="mdi mdi-cancel" aria-hidden="true" />
      </button>

      <button type="button" class="profile-action-btn" disabled>
        <i class="mdi mdi-share-variant" aria-hidden="true" />
      </button>
    </div>
  </article>

  <Teleport to="body">
    <Transition name="profile-lightbox-fade">
      <div
        v-if="lightboxOpen"
        class="profile-lightbox"
        role="presentation"
      >
        <button
          type="button"
          class="profile-lightbox__scrim"
          aria-label="Close photo lightbox"
          @click="lightboxOpen = false"
        />
        <div class="lightbox-wrap">
          <button
            type="button"
            class="lightbox-close"
            aria-label="Close photo lightbox"
            @click.stop="lightboxOpen = false"
          >
            <i class="mdi mdi-close" aria-hidden="true" />
          </button>
          <img
            :src="lightboxSrc"
            class="lightbox-img"
            alt=""
            @click.stop
          >
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, useSlots, watch } from "vue";
import { getAvatar, getAvatarIcon, getGenderHexColor } from "@/composables/useUserUtils";
import { resolveProfileLocalization, normalizeLocale } from "@/composables/useProfileLocalization";

const props = defineProps({
  profile: { type: Object, default: null },
  avatarDecoration: { type: String, default: "" },
  maxWidth: { type: [Number, String], default: "100%" },
  stats: { type: Object, default: null },
  photoGalleryPhotos: { type: Array, default: () => [] },
  photoGalleryCount: { type: Number, default: 0 },
  galleryBlurred: { type: Boolean, default: false },
  localeOverride: { type: String, default: "" },
  themeOverride: { type: String, default: "" },
});

const emit = defineEmits(["likePhoto", "chat-now", "upvoted"]);
const avatarLoadError = ref(false);
const resolvedAvatarUrl = ref("");
const avatarResolveTried = ref(false);

const normalizeCardTheme = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (["trading", "vintage", "holo"].includes(key)) return key;
  return "trading";
};

const resolvedCardTheme = computed(() =>
  normalizeCardTheme(props.themeOverride || props.profile?.profile_card_theme)
);

const profileAvatarSrc = computed(() => {
  if (resolvedAvatarUrl.value) {
    return resolvedAvatarUrl.value;
  }
  if (avatarLoadError.value) {
    return getAvatar("", props.profile?.gender_id);
  }
  return getAvatar(props.profile?.avatar_url, props.profile?.gender_id);
});

const tryResolveBrokenAvatar = async () => {
  if (avatarResolveTried.value) return false;
  const userId = String(props.profile?.user_id || "");
  const source = String(props.profile?.avatar_url || "");
  if (!userId || !source) return false;

  avatarResolveTried.value = true;
  try {
    const result = await $fetch("/api/profile/avatar-resolve", {
      query: { userId },
    });
    const resolved = String(result?.avatarUrl || "");
    if (!resolved || resolved === source) return false;
    resolvedAvatarUrl.value = resolved;
    avatarLoadError.value = false;
    return true;
  } catch (err) {
    console.warn("[profile-card] avatar resolve failed:", err);
    return false;
  }
};

const onAvatarError = async () => {
  const resolved = await tryResolveBrokenAvatar();
  if (resolved) return;
  avatarLoadError.value = true;
};

watch(
  () => props.profile?.avatar_url,
  () => {
    avatarLoadError.value = false;
    resolvedAvatarUrl.value = "";
    avatarResolveTried.value = false;
  }
);

const emptyStats = {
  lastActive: null,
  comments: { count: 0, items: [] },
  upvotes: { count: 0, items: [] },
};

const profileSiteUrl = computed(() => {
  const siteUrl = props.profile?.site_url;
  if (!siteUrl || typeof siteUrl !== "string") return null;
  return siteUrl.trim().startsWith("http")
    ? siteUrl
    : `https://${siteUrl.trim()}`;
});

const { t, locale } = useI18n();
const slots = useSlots();
const hasOverlaySlot = computed(() => Boolean(slots.overlay));

const localized = computed(() =>
  resolveProfileLocalization({
    profile: props.profile,
    readerLocale: locale?.value,
    overrideLocale: props.localeOverride,
  })
);
const defaultLanguageCode = computed(() =>
  normalizeLocale(props.profile?.preferred_locale)
);
const defaultLanguageLabel = computed(() => {
  const code = defaultLanguageCode.value;
  if (!code) return "";
  const label = t(`components.profile-language.options.${code}`, code.toUpperCase());
  return label || code.toUpperCase();
});
const lookingForLabel = computed(() =>
  Array.isArray(props.profile?.looking_for) ? props.profile.looking_for.join(", ") : ""
);
const lookingForUserId = computed(() => props.profile?.user_id || props.profile?.id || "");
const localPath = useLocalePath();
const chatLink = computed(() => {
  const slug = props.profile?.slug;
  if (slug) return localPath(`/chat?userslug=${slug}`);
  const userId = props.profile?.user_id || props.profile?.id;
  if (userId) return localPath(`/chat?userId=${userId}`);
  return localPath("/chat");
});

const expandedSections = ref([]);
const isSectionExpanded = (section) => expandedSections.value.includes(section);
const toggleSection = (section) => {
  expandedSections.value = isSectionExpanded(section)
    ? expandedSections.value.filter((entry) => entry !== section)
    : [...expandedSections.value, section];
};

const statsData = computed(() => props.stats || emptyStats);
const dateTimeFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const lastConnectionLabel = computed(() => {
  const value = statsData.value?.lastActive;
  if (!value) return "—";
  try {
    return dateTimeFmt.format(new Date(value));
  } catch {
    return String(value);
  }
});

const galleryItems = computed(() => {
  const items = Array.isArray(props.photoGalleryPhotos)
    ? props.photoGalleryPhotos
    : [];
  const hasStatus = items.some((item) => item?.status);
  if (!hasStatus) return items;
  return items.filter((item) => item?.status === "approved");
});

const galleryBlurred = computed(() => props.galleryBlurred);

const galleryCount = computed(() =>
  galleryBlurred.value
    ? Number(props.photoGalleryCount || 0)
    : galleryItems.value.length
);

const galleryDisplayItems = computed(() => {
  if (!galleryBlurred.value) return galleryItems.value;
  const total = Number(props.photoGalleryCount || 0);
  const show = Math.min(total || 0, 8);
  return Array.from({ length: show }, (_, idx) => ({
    _placeholderId: `placeholder-${idx}`,
  }));
});

const lightboxSrc = ref(null);
const lightboxOpen = computed({
  get: () => Boolean(lightboxSrc.value),
  set: (v) => { if (!v) lightboxSrc.value = null; },
});

function openLightbox(item) {
  const src = item.url || item.public_url;
  if (src) lightboxSrc.value = src;
}
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.profile-card {
  position: relative;
  overflow: hidden;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(59, 130, 246, 0.2), transparent 52%),
    linear-gradient(155deg, #08122d 0%, #0b1a3f 48%, #121b2e 100%);
  box-shadow:
    0 20px 36px rgba(0, 0, 0, 0.36),
    inset 0 0 0 1px rgba(255, 255, 255, 0.08);
  width: 100%;
  --profile-chat-cta-color: #eef4ff;
  --profile-surface-soft: rgba(255, 255, 255, 0.08);
  --profile-label-color: rgba(222, 233, 255, 0.78);
  --profile-value-color: #c7dcff;
  --profile-value-green: #4ade80;
  --profile-body-color: rgba(242, 247, 255, 0.92);
  --profile-panel-title-color: rgba(225, 236, 255, 0.86);
  --profile-gallery-count-color: rgba(230, 240, 255, 0.9);
  --profile-gallery-empty-color: rgba(226, 238, 255, 0.78);
}

.profile-card--vintage {
  border-color: rgba(120, 72, 32, 0.35);
  background:
    radial-gradient(120% 90% at 50% 0%, rgba(234, 179, 8, 0.2), transparent 52%),
    linear-gradient(155deg, #302112 0%, #3a2714 42%, #23170f 100%);
  --profile-chat-cta-color: #fff5dc;
  --profile-surface-soft: rgba(255, 247, 219, 0.12);
  --profile-label-color: rgba(255, 234, 196, 0.84);
  --profile-value-color: #ffdca1;
  --profile-value-green: #86efac;
  --profile-body-color: rgba(255, 242, 215, 0.92);
  --profile-panel-title-color: rgba(255, 232, 182, 0.84);
  --profile-gallery-count-color: rgba(255, 234, 196, 0.86);
  --profile-gallery-empty-color: rgba(255, 234, 196, 0.78);
}

.profile-card--holo {
  border-color: rgba(148, 163, 184, 0.5);
  background:
    radial-gradient(100% 80% at 10% 10%, rgba(16, 185, 129, 0.25), transparent 52%),
    radial-gradient(120% 85% at 92% 14%, rgba(14, 165, 233, 0.22), transparent 58%),
    linear-gradient(145deg, #0a0d26 0%, #102244 42%, #10201d 100%);
  --profile-chat-cta-color: #f0fdff;
  --profile-surface-soft: rgba(226, 255, 255, 0.1);
  --profile-label-color: rgba(214, 255, 255, 0.82);
  --profile-value-color: #c8fffa;
  --profile-value-green: #67e8f9;
  --profile-body-color: rgba(233, 253, 255, 0.92);
  --profile-panel-title-color: rgba(208, 255, 255, 0.84);
  --profile-gallery-count-color: rgba(210, 254, 255, 0.88);
  --profile-gallery-empty-color: rgba(210, 254, 255, 0.78);
}

.profile-card--vintage .profile-card-rarity {
  border-color: rgba(251, 191, 36, 0.45);
  background: rgba(95, 57, 21, 0.52);
}

.profile-card--holo .profile-card-rarity {
  border-color: rgba(45, 212, 191, 0.52);
  background: rgba(17, 94, 89, 0.36);
}

.profile-card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(circle at 16% 13%, rgba(255, 255, 255, 0.24), transparent 24%),
    radial-gradient(circle at 90% 84%, rgba(56, 189, 248, 0.22), transparent 27%);
}

.profile-card-header {
  position: relative;
  padding: 14px 18px 8px;
}

.profile-card-rarity {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 4px 11px;
  border-radius: 10px;
  font-size: 0.64rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
  color: rgba(225, 236, 255, 0.9);
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(191, 219, 254, 0.4);
  box-shadow: 0 4px 10px rgba(2, 6, 23, 0.3);
  backdrop-filter: blur(1px);
}

.profile-card-hero {
  margin-top: 2px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 14px;
}

.profile-chat-cta {
  display: inline-flex;
  margin-top: 8px;
  min-height: 30px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  text-align: center;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.02em;
  color: var(--profile-chat-cta-color);
  text-decoration: none;
  border: 1px solid rgba(191, 219, 254, 0.42);
  background: rgba(30, 64, 175, 0.32);
}

.profile-chat-cta:hover {
  background: rgba(30, 64, 175, 0.46);
}

.profile-flag {
  line-height: 1;
  font-size: 1.02rem;
}

.profile-title-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 10px;
  margin-bottom: 2px;
}

.profile-identity {
  position: relative;
  text-align: left;
  min-width: 0;
}

.profile-title {
  font-size: 1.7rem !important;
  line-height: 1.05;
   margin: 0 0 4px;
  max-width: 100%;
  margin-bottom: 4px;
  color: #eef4ff;
  font-weight: 700;
}

.profile-stats-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  justify-content: flex-start;
}

.profile-stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 22px;
  border-radius: 8px;
  padding: 2px 8px;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(237, 245, 255, 0.95);
  border: 1px solid rgba(191, 219, 254, 0.3);
  background: rgba(15, 23, 42, 0.48);
}

.profile-stat-pill--flag {
  min-width: 32px;
  justify-content: center;
  padding-left: 6px;
  padding-right: 6px;
}

.profile-stat-pill--icon-only {
  min-width: 24px;
  justify-content: center;
  padding-left: 5px;
  padding-right: 5px;
}

.profile-stat-pill--looking-for {
  min-height: 24px;
  padding: 1px 6px;
}

.profile-stat-icon {
  font-size: 13px;
}

.gender-inline {
  color: var(--profile-gender-color, #a855f7) !important;
  background: transparent !important;
}

.profile-stat-pill--looking-for :deep(.pa-1) {
  padding: 0 2px !important;
}

.avatar-wrapper {
  position: relative;
  width: 112px;
  height: 112px;
  min-width: 112px;
}

.avatar-decoration {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 180px;
  height: 180px;
  pointer-events: none;
  z-index: 2;
  object-fit: contain;
}

.profile-avatar-image {
  position: relative;
  z-index: 1;
  display: block;
  box-shadow: 0 10px 20px rgba(2, 6, 23, 0.45);
  border: 2px solid rgba(191, 219, 254, 0.45);
}

.profile-tagline-inline {
  margin-top: 6px;
  margin-bottom: 0;
  color: var(--profile-body-color);
  opacity: 0.9;
  font-size: 0.83rem;
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.gender-inline {
  opacity: 0.9;
}

.profile-details {
  background: var(--profile-surface-soft);
  border-radius: 14px;
}

.profile-details--always-open {
  margin: 0 14px 10px;
}

.profile-details-about {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
}

.profile-details-about__icon {
  margin-top: 0.2rem;
  color: var(--profile-label-color);
  font-size: 1rem;
}

.profile-details-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.profile-details-row--stack {
  display: grid;
  grid-template-columns: 96px 1fr;
  align-items: start;
  column-gap: 8px;
}

.profile-details-row--split {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
}

.profile-details-split-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.profile-details-split-item .profile-details-label {
  min-width: auto;
}

.profile-details-split-item .profile-details-value {
  text-align: left;
}

@media (max-width: 600px) {
  .profile-details-row--split {
    grid-template-columns: 1fr;
  }
}

.profile-details-about .profile-details-row--stack {
  grid-template-columns: 1fr;
}

.profile-details-about .profile-details-label {
  min-width: 0;
}

.profile-details-label {
  min-width: 96px;
  color: var(--profile-label-color);
}

.profile-details-value {
  flex: 1;
  text-align: center;
  font-weight: 700;
  color: var(--profile-value-color);
  font-size: 1rem;
}

.profile-details-value--green {
  color: var(--profile-value-green);
}

.profile-details-bio {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--profile-body-color);
  font-style: italic;
  border-left: 3px solid rgba(191, 219, 254, 0.5);
  padding-left: 1rem;
}

.profile-details-body {
  flex: 1;
  line-height: 1.5;
  color: var(--profile-body-color);
  white-space: normal;
  min-width: 0;
}

.profile-stats {
  background: var(--profile-surface-soft);
  border-radius: 14px;
}

.profile-gallery {
  background: var(--profile-surface-soft);
  border-radius: 14px;
}

.profile-gallery-strip {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 6px 0 2px;
}

.profile-gallery-item {
  flex: 0 0 64px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.profile-gallery-thumb-wrap {
  width: 64px;
  height: 64px;
  border-radius: 10px;
  overflow: hidden;
}

.profile-gallery-thumb {
  width: 100%;
  height: 100%;
}

.profile-gallery-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #5b6789, #3f4a66);
  filter: blur(6px);
}

.profile-gallery-like {
  align-self: center;
  position: relative;
  left: -2px;
}

.profile-gallery-vote {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.profile-gallery-like-count {
  font-size: 0.75rem;
  color: var(--profile-gallery-count-color);
  line-height: 1;
}

.profile-gallery-empty {
  color: var(--profile-gallery-empty-color);
  font-size: 0.9rem;
  padding: 8px 0;
}

.profile-gallery-signin {
  margin-top: 6px;
  font-size: 0.85rem;
}

.profile-gallery-signin a {
  color: #2563eb;
  text-decoration: none;
}

.profile-gallery-signin a:hover {
  text-decoration: underline;
}

.profile-panels {
  display: grid;
  gap: 0.35rem;
}

.profile-panel-title {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  border: 0;
  background: transparent;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.66rem;
  color: var(--profile-panel-title-color);
  cursor: pointer;
}

.profile-panel-title__icon {
  font-size: 1rem;
}

.profile-panel-title:hover,
.profile-panel-title:focus-visible {
  opacity: 0.92;
  outline: none;
}

.profile-panel-body {
  padding: 0 14px 10px;
}

.profile-stats-item {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 0.75rem;
  padding: 0.9rem 1rem;
}

.profile-stats-item__icon {
  margin-top: 0.2rem;
  color: var(--profile-label-color);
  font-size: 1rem;
}

.profile-stats-item__label {
  color: var(--profile-label-color);
  font-size: 0.85rem;
}

.profile-stats-item__value {
  margin-top: 0.15rem;
  color: var(--profile-body-color);
  font-size: 0.95rem;
  font-weight: 600;
}

.profile-card-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  position: relative;
  bottom: 0;
  width: 100%;
  padding: 0.75rem 0.9rem;
  background: rgba(10, 19, 41, 0.66);
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

.profile-card-actions__spacer {
  flex: 1;
}

.profile-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(226, 232, 240, 0.78);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.profile-action-btn:hover:not(:disabled),
.profile-action-btn:focus-visible {
  background: rgba(148, 163, 184, 0.12);
  color: #fff;
  outline: none;
}

.profile-action-btn:disabled {
  cursor: default;
  opacity: 0.45;
}

@media (max-width: 760px) {
  .profile-card {
    border-radius: 16px;
  }

  .profile-card-rarity {
    top: 10px;
    right: 10px;
    min-height: 21px;
    font-size: 0.57rem;
    letter-spacing: 0.1em;
    padding: 3px 8px;
  }

  .profile-card-header {
    padding: 12px 12px 8px;
  }

  .profile-card-hero {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 10px;
  }

  .profile-identity {
    text-align: center;
  }

  .profile-title-row {
    justify-content: center;
  }

  .profile-title {
    width: 100%;
    text-align: center;
  }

  .profile-stats-strip {
    justify-content: center;
    gap: 4px;
  }

  .profile-stat-pill {
    font-size: 0.66rem;
    min-height: 20px;
    padding: 2px 7px;
  }

  .profile-chat-cta {
    margin-top: 7px;
  }

  .profile-tagline-inline {
    text-align: center;
  }

  .avatar-decoration {
    width: 170px;
    height: 170px;
  }
}

:global(.v-theme--light) .profile-card {
  --profile-chat-cta-color: #f8fbff;
  --profile-surface-soft: rgba(255, 255, 255, 0.52);
  --profile-label-color: rgba(26, 43, 75, 0.86);
  --profile-value-color: #0c306f;
  --profile-value-green: #0f9f5c;
  --profile-body-color: rgba(12, 34, 68, 0.94);
}

.profile-gallery-thumb-wrap--clickable {
  cursor: zoom-in;
  transition: opacity 0.15s ease;
}

.profile-gallery-thumb-wrap--clickable:hover {
  opacity: 0.85;
}

.profile-lightbox {
  position: fixed;
  inset: 0;
  z-index: 2300;
}

.profile-lightbox__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(2 6 23 / 0.84);
}

.lightbox-wrap {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: translate(-50%, -50%);
  width: min(calc(100vw - 2rem), 900px);
  max-height: calc(100vh - 2rem);
}

.lightbox-close {
  position: absolute;
  top: -36px;
  right: 0;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  background: rgb(15 23 42 / 0.56);
  color: #fff;
  cursor: pointer;
}

.lightbox-img {
  border-radius: 8px;
  max-width: 100%;
  max-height: 80vh;
}

.profile-lightbox-fade-enter-active,
.profile-lightbox-fade-leave-active {
  transition: opacity 160ms ease;
}

.profile-lightbox-fade-enter-from,
.profile-lightbox-fade-leave-to {
  opacity: 0;
}
</style>
