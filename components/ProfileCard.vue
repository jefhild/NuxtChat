<template>
  <v-card
    v-if="profile"
    :class="['mx-auto', 'profile-card', `profile-card--${resolvedCardTheme}`]"
    :max-width="maxWidth"
  >
    <div class="profile-card-glow" />
    <slot name="overlay" />
    <div class="profile-card-header">
      <div class="profile-card-rarity">Profile Card</div>
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

      <NuxtLink :to="chatLink" class="profile-chat-cta" @click="emit('chat-now')">
        {{ $t("components.profile-details.chat-cta", { name: localized.displayname }) }}
      </NuxtLink>
    </div>

    <div class="profile-identity">
      <div class="profile-title-row">
        <h1 class="text-h5">
          {{ localized.displayname }}
        </h1>
      </div>
      <div class="profile-meta-chips">
        <div class="profile-meta-chip">
          <v-icon
            v-if="profile?.gender_id"
            class="gender-inline"
            :color="getGenderColor(profile.gender_id)"
            :icon="getAvatarIcon(profile.gender_id)"
            size="17"
          />
          <span v-if="profile?.age">
            {{ profile.age }}{{ $t("components.profile-details.age-suffix") }}
          </span>
        </div>
        <div v-if="profile?.status" class="profile-meta-chip">
          {{ profile.status }}
        </div>
        <v-tooltip
          v-if="defaultLanguageLabel"
          :text="$t('components.profile-language.default')"
        >
          <template #activator="{ props: tooltipProps }">
            <div class="profile-meta-chip" v-bind="tooltipProps">
              <v-icon size="15">mdi-translate</v-icon>
              <span>{{ defaultLanguageLabel }}</span>
            </div>
          </template>
        </v-tooltip>
        <div
          v-if="profile?.country_emoji"
          class="profile-meta-chip profile-meta-chip--flag"
        >
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
    </div>

    <v-expansion-panels v-model="expandedSections" multiple class="profile-panels">
      <v-expansion-panel value="profile">
        <v-expansion-panel-title class="profile-panel-title">
          {{ $t("components.profile-details.title") }}
        </v-expansion-panel-title>
        <v-expansion-panel-text class="profile-details">
          <v-list class="profile-details-tree" density="compact" nav>
            <v-list-item
              v-if="localized.tagline"
              prepend-icon="mdi-tag-outline"
            >
              <template #title>
                <div class="profile-details-row">
                  <span class="profile-details-label">
                    {{ $t("components.profile-details.tagline-label") }}:
                  </span>
                  <span class="profile-details-value">
                    {{ localized.tagline }}
                  </span>
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

    <v-card-actions class="profile-card-actions">
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
        @click="emit('chat-now')"
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
  themeOverride: { type: String, default: "" },
});

const emit = defineEmits(["likePhoto", "chat-now"]);

const normalizeCardTheme = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (["trading", "vintage", "holo"].includes(key)) return key;
  return "trading";
};

const resolvedCardTheme = computed(() =>
  normalizeCardTheme(props.themeOverride || props.profile?.profile_card_theme)
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
  padding: 16px 22px 4px;
  text-align: center;
}

.profile-card-rarity {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(225, 236, 255, 0.9);
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(191, 219, 254, 0.4);
}

.profile-chat-cta {
  display: inline-flex;
  margin-top: 0;
  margin-bottom: 8px;
  min-height: 34px;
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  text-align: center;
  font-weight: 600;
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
  justify-content: space-between;
  gap: 12px;
}

.profile-identity {
  position: relative;
  padding: 0 20px 8px;
  text-align: center;
}

.profile-identity .text-h5 {
  color: #eef4ff;
  font-weight: 700;
}

.profile-meta-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

.profile-meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 30px;
  border-radius: 999px;
  padding: 5px 11px;
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(237, 245, 255, 0.95);
  border: 1px solid rgba(191, 219, 254, 0.4);
  background: rgba(15, 23, 42, 0.55);
}

.profile-meta-chip--flag {
  min-width: 44px;
  justify-content: center;
}

.avatar-wrapper {
  position: relative;
  margin-top: 8px;
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
  opacity: 0.9;
}

.profile-details {
  background: var(--profile-surface-soft);
  border-radius: 14px;
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

.profile-details-about :deep(.v-list-item__prepend) {
  align-self: flex-start;
  margin-top: -1px;
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

.profile-panels :deep(.v-expansion-panel) {
  background: transparent;
}

.profile-panels :deep(.v-expansion-panel__shadow) {
  box-shadow: none;
}

.profile-panels :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 16px 12px;
}

.profile-card-actions {
  position: relative;
  bottom: 0;
  width: 100%;
  background: rgba(10, 19, 41, 0.66);
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

@media (max-width: 760px) {
  .profile-card {
    border-radius: 16px;
  }

  .profile-card-header {
    padding: 14px 12px 4px;
  }

  .profile-identity {
    padding: 0 12px 8px;
  }

  .profile-meta-chips {
    gap: 6px;
  }

  .profile-meta-chip {
    font-size: 0.8rem;
    min-height: 28px;
    padding: 4px 10px;
  }

  .avatar-decoration {
    width: 215px;
  }
}

:global(.v-theme--light) .profile-card {
  --profile-chat-cta-color: #f8fbff;
  --profile-surface-soft: rgba(255, 255, 255, 0.52);
  --profile-label-color: rgba(26, 43, 75, 0.86);
  --profile-value-color: #0c306f;
  --profile-value-green: #0f9f5c;
  --profile-body-color: rgba(12, 34, 68, 0.94);
  --profile-panel-title-color: rgba(21, 37, 68, 0.76);
  --profile-gallery-count-color: rgba(17, 34, 64, 0.84);
  --profile-gallery-empty-color: rgba(25, 45, 76, 0.74);
}
</style>
