<template>
  <v-card
    v-if="profile"
    class="mx-auto profile-card"
    :max-width="maxWidth"
  >
    <slot name="overlay" />
    <div class="avatar-wrapper">
      <NuxtImg
        :src="getAvatar(profile.avatar_url, profile.gender_id)"
        height="150"
        width="150"
        class="rounded-circle cover-image mx-auto d-block ma-9"
        :alt="`${localized.displayname} image`"
      />


      <NuxtImg
        v-if="avatarDecoration"
        :src="avatarDecoration"
        class="avatar-decoration"
        :alt="`${localized.displayname} image decoration`"
      />
    </div>

    <NuxtLink :to="chatLink" class="profile-chat-cta">
      {{ $t("components.profile-details.chat-cta", { name: localized.displayname }) }}
    </NuxtLink>

    <v-card-title>
      <v-row>
        <v-col>
          <div class="profile-title-row">
            <h1 class="text-h5">
              {{ localized.displayname }}
            </h1>
            <div class="profile-age-flag">
              <v-icon
                v-if="profile?.gender_id"
                class="gender-inline"
                :color="getGenderColor(profile.gender_id)"
                :icon="getAvatarIcon(profile.gender_id)"
                size="18"
              />
              <span v-if="profile?.age">
                {{ profile.age }}{{ $t("components.profile-details.age-suffix") }}
              </span>
              <v-tooltip v-if="profile?.country_emoji && profile?.country" :text="profile.country">
                <template #activator="{ props: tooltipProps }">
                  <span class="profile-flag" v-bind="tooltipProps">
                    {{ profile.country_emoji }}
                  </span>
                </template>
              </v-tooltip>
              <span v-else-if="profile?.country_emoji" class="profile-flag">
                {{ profile.country_emoji }}
              </span>
            </div>
          </div>
        </v-col>
      </v-row>
    </v-card-title>

    <v-card-subtitle>
      <v-row>
        <v-col class="justify-end d-flex align-center">
          {{ profile?.status }}
        </v-col>
      </v-row>
    </v-card-subtitle>

    <v-expansion-panels v-model="expandedSections" multiple class="profile-panels">
      <v-expansion-panel value="profile">
        <v-expansion-panel-title class="profile-panel-title">
          {{ $t("components.profile-details.title") }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="profile-details">
          <v-list class="profile-details-tree" density="compact" nav>
            <v-list-item
              v-if="localized.tagline || defaultLanguageLabel"
              prepend-icon="mdi-tag-outline"
            >
              <template #title>
                <div class="profile-details-row profile-details-row--split">
                  <div
                    v-if="localized.tagline"
                    class="profile-details-split-item"
                  >
                    <span class="profile-details-label">
                      {{ $t("components.profile-details.tagline-label") }}:
                    </span>
                    <span class="profile-details-value">
                      {{ localized.tagline }}
                    </span>
                  </div>
                  <div
                    v-if="defaultLanguageLabel"
                    class="profile-details-split-item"
                  >
                    <span class="profile-details-label">
                      <v-icon size="14" class="mr-1">mdi-translate</v-icon>
                      {{ $t("components.profile-language.default") }}:
                    </span>
                    <span class="profile-details-value">
                      {{ defaultLanguageLabel }}
                    </span>
                  </div>
                </div>
              </template>
            </v-list-item>
            <v-list-item
              v-if="profile?.looking_for?.length"
              prepend-icon="mdi-account-search-outline"
            >
              <template #title>
                <div class="profile-details-row">
                  <span class="profile-details-label">
                    {{ $t("components.public-user-profile.looking-for") }}
                  </span>
                  <span class="profile-details-value profile-details-value--green">
                    {{ profile.looking_for.join(", ") }}
                  </span>
                </div>
              </template>
            </v-list-item>
            <v-list-item
              v-if="localized.bio"
              class="profile-details-about"
              prepend-icon="mdi-account-details-outline"
            >
              <template #title>
                <div class="profile-details-row profile-details-row--stack">
                  <span class="profile-details-label">
                    {{ $t("components.public-user-profile.about-me") }}
                  </span>
                  <span class="profile-details-body">
                    {{ localized.bio }}
                  </span>
                </div>
              </template>
            </v-list-item>
          </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="gallery">
        <v-expansion-panel-title class="profile-panel-title">
          {{ $t("components.profile-gallery.title", { count: galleryCount }) }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="profile-gallery">
          <template v-if="galleryDisplayItems.length">
            <div class="profile-gallery-strip">
            <div
              v-for="item in galleryDisplayItems"
              :key="item.id || item.storage_path || item.public_url || item._placeholderId"
              class="profile-gallery-item"
              :class="{ 'profile-gallery-item--blurred': galleryBlurred }"
            >
              <div class="profile-gallery-thumb-wrap">
                <v-img
                  v-if="item.url || item.public_url"
                  :src="item.url || item.public_url"
                  class="profile-gallery-thumb"
                  cover
                />
                <div v-else class="profile-gallery-placeholder" />
              </div>
              <div
                v-if="!galleryBlurred && (item.url || item.public_url)"
                class="profile-gallery-vote"
              >
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  class="profile-gallery-like"
                  :color="item.myVote === 1 ? 'primary' : undefined"
                  @click.stop="emit('likePhoto', item)"
                >
                  <v-icon size="14">mdi-thumb-up-outline</v-icon>
                </v-btn>
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
        </v-expansion-panel-text>
      </v-expansion-panel>

      <v-expansion-panel value="stats">
        <v-expansion-panel-title class="profile-panel-title">
          {{ $t("components.profile-stats.title") }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="profile-stats">
          <v-list class="profile-stats-tree" density="compact" nav>
        <v-list-item
          prepend-icon="mdi-clock-outline"
          :title="$t('components.profile-stats.last-connection')"
          :subtitle="lastConnectionLabel"
        />
            <v-list-group value="comments">
              <template #activator="{ props: activatorProps }">
                <v-list-item
                  v-bind="activatorProps"
                  prepend-icon="mdi-comment-multiple-outline"
                  :title="$t('components.profile-stats.comments-count', { count: statsData.comments.count })"
                />
              </template>
              <v-list-item
                v-for="item in statsData.comments.items"
                :key="item.id"
                class="profile-stats-child"
                prepend-icon="mdi-chat-outline"
                :title="item.title"
                :subtitle="formatStatSubtitle(item, discussionLabel)"
                :to="statLink(item)"
                :link="Boolean(statLink(item))"
              />
            </v-list-group>
            <v-list-group value="upvotes">
              <template #activator="{ props: activatorProps }">
                <v-list-item
                  v-bind="activatorProps"
                  prepend-icon="mdi-thumb-up-outline"
                  :title="$t('components.profile-stats.upvotes-count', { count: statsData.upvotes.count })"
                />
              </template>
              <v-list-item
                v-for="item in statsData.upvotes.items"
                :key="item.id"
                class="profile-stats-child"
                prepend-icon="mdi-newspaper-variant-outline"
                :title="item.title"
                :subtitle="formatStatSubtitle(item, item.type === 'thread' ? discussionLabel : articleLabel)"
                :to="statLink(item)"
                :link="Boolean(statLink(item))"
              />
            </v-list-group>
          </v-list>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <v-card-actions
      style="
        position: relative;
        bottom: 0;
        width: 100%;
        background-color: rgba(0, 0, 0, 0.1);
      "
    >
      <v-btn
        v-if="profileSiteUrl"
        :href="profileSiteUrl"
        color="medium-emphasis"
        icon="mdi-link-variant"
        size="small"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="
          $t('components.public-user-profile.visit1') +
          `${localized.displayname}` +
          $t('components.public-user-profile.visit2')
        "
      ></v-btn>
      <v-btn
        v-else
        color="medium-emphasis"
        icon="mdi-link-variant-off"
        size="small"
        disabled
      ></v-btn>
      <v-spacer></v-spacer>

      <v-btn
        :to="chatLink"
        color="blue medium-emphasis"
        icon="mdi-chat-outline"
        size="small"
      ></v-btn>

      <ButtonFavorite :profile="profile" />

      <v-btn color="medium-emphasis" icon="mdi-cancel" size="small"></v-btn>

      <v-btn
        color="medium-emphasis"
        icon="mdi-share-variant"
        size="small"
      ></v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed, ref } from "vue";
import { getAvatar, getAvatarIcon, getGenderColor } from "@/composables/useUserUtils";
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
});

const emit = defineEmits(["likePhoto"]);

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
  if (!code) return "—";
  const label = t(`components.profile-language.options.${code}`, code.toUpperCase());
  return label || code.toUpperCase();
});
const localPath = useLocalePath();
const chatLink = computed(() => {
  const slug = props.profile?.slug;
  if (slug) return localPath(`/chat?userslug=${slug}`);
  const userId = props.profile?.user_id || props.profile?.id;
  if (userId) return localPath(`/chat?userId=${userId}`);
  return localPath("/chat");
});

const expandedSections = ref(["profile"]);

const statsData = computed(() => props.stats || emptyStats);
const discussionLabel = computed(() =>
  String(t("components.profile-stats.discussion-label"))
);
const articleLabel = computed(() =>
  String(t("components.profile-stats.article-label"))
);

const dateFmt = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
});
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

const formatStatSubtitle = (item, label) => {
  if (!item?.createdAt) return label;
  try {
    return `${label} · ${dateFmt.format(new Date(item.createdAt))}`;
  } catch {
    return label;
  }
};

const statLink = (item) => {
  const slug = item?.articleSlug ?? item?.article?.slug ?? item?.slug;
  if (!slug) return undefined;
  return `${localPath(`/articles/${slug}`)}#discussion`;
};

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
</script>

<style scoped>
.cover-image {
  object-fit: cover;
}

.profile-card {
  width: 100%;
  --profile-chat-cta-color: #2563eb;
  --profile-subtitle-1: #757575;
  --profile-subtitle-2: #9e9e9e;
  --profile-surface-soft: rgba(17, 24, 39, 0.04);
  --profile-label-color: rgba(0, 0, 0, 0.75);
  --profile-value-color: #1d4ed8;
  --profile-value-green: #15803d;
  --profile-body-color: #374151;
  --profile-panel-title-color: rgba(0, 0, 0, 0.6);
  --profile-gallery-count-color: rgba(0, 0, 0, 0.7);
  --profile-gallery-empty-color: rgba(0, 0, 0, 0.6);
}

.profile-chat-cta {
  display: block;
  width: 100%;
  text-align: center;
  font-weight: 600;
  color: var(--profile-chat-cta-color);
  margin-top: -12px;
  margin-bottom: 8px;
  text-decoration: none;
}

.profile-chat-cta:hover {
  text-decoration: underline;
}

.profile-flag {
  margin-left: 0.25rem;
}

.profile-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.profile-age-flag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
}

.avatar-wrapper {
  position: relative;
}

.avatar-decoration {
  position: absolute;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  width: 245px;
  pointer-events: none;
  z-index: 1;
  object-fit: contain;
}

.gender-inline {
  opacity: 0.75;
}

.subtitle-1 {
  font-size: 1.2rem;
  color: var(--profile-subtitle-1);
}

.subtitle-2 {
  font-size: 1rem;
  color: var(--profile-subtitle-2);
}

.profile-details {
  background: var(--profile-surface-soft);
}

.profile-details-tree {
  padding: 0;
}

.profile-details-child {
  padding-left: 28px;
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
  color: #374151;
  font-style: italic;
  border-left: 3px solid #d1d5db;
  padding-left: 1rem;
}

.profile-details-body {
  flex: 1;
  line-height: 1.5;
  color: var(--profile-body-color);
  white-space: normal;
  min-width: 0;
}

.profile-details-about :deep(.v-list-item__prepend) {
  align-self: flex-start;
  margin-top: -1px;
}

.profile-stats {
  background: var(--profile-surface-soft);
}

.profile-gallery {
  background: var(--profile-surface-soft);
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
  background: linear-gradient(135deg, #d8dbe2, #c3c7d1);
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

.profile-stats-tree {
  padding: 0;
}

.profile-stats-child {
  padding-left: 28px;
}

.profile-panels :deep(.v-expansion-panel-title) {
  padding: 10px 16px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.7rem;
  color: var(--profile-panel-title-color);
}

.profile-panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 16px 12px;
}

:global(.v-theme--dark) .profile-card {
  --profile-chat-cta-color: #7aa2ff;
  --profile-subtitle-1: rgba(255, 255, 255, 0.86);
  --profile-subtitle-2: rgba(255, 255, 255, 0.72);
  --profile-surface-soft: rgba(255, 255, 255, 0.06);
  --profile-label-color: rgba(255, 255, 255, 0.8);
  --profile-value-color: #8ab4ff;
  --profile-value-green: #4ade80;
  --profile-body-color: rgba(255, 255, 255, 0.86);
  --profile-panel-title-color: rgba(255, 255, 255, 0.72);
  --profile-gallery-count-color: rgba(255, 255, 255, 0.78);
  --profile-gallery-empty-color: rgba(255, 255, 255, 0.72);
}
</style>
