<template>
  <div class="home-profiles">
    <LoadingContainer v-if="isLoading" />

    <div v-else>
      <div class="home-profiles__intro">
        <div class="home-profiles__titles">
          <h2 class="home-profiles__title">
            {{ $t(props.titleKey || "components.homeProfiles.title") }}
          </h2>
          <p class="home-profiles__subtitle">
            {{ $t(props.subtitleKey || "components.homeProfiles.subtitle") }}
          </p>
        </div>
      </div>

      <div v-if="useTableLayout" class="profiles-table-shell">
        <table v-if="displayedProfiles.length" class="profiles-table">
          <thead>
            <tr>
              <th
                v-for="header in headers"
                :key="header.key"
                :class="['profiles-table__head', header.numeric ? 'profiles-table__head--numeric' : '']"
                scope="col"
              >
                {{ header.title }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="item in displayedProfiles"
              :key="item.user_id || item.id"
              class="profiles-table__row"
            >
              <td class="profiles-table__cell">
                <div class="profiles-table__profile">
                  <div class="avatar-stack avatar-stack--desktop">
                    <img
                      class="profile-avatar profile-avatar--desktop"
                      :src="getAvatar(item.avatar_url, item.gender_id)"
                      :alt="displayNameFor(item) || 'Profile avatar'"
                    />
                    <span v-if="item.country_emoji" class="avatar-flag">
                      {{ item.country_emoji }}
                    </span>
                    <span v-if="item.has_email" class="registered-badge" aria-hidden="true">
                      <i class="mdi mdi-star registered-badge__icon" />
                    </span>
                    <span class="gender-badge" aria-hidden="true">
                      <i
                        :class="['mdi', getAvatarIcon(resolveGenderId(item)), 'profile-gender-icon']"
                        :style="{ '--profile-gender-color': getGenderHexColor(resolveGenderId(item)) }"
                      />
                    </span>
                  </div>

                  <div class="profiles-table__profile-content">
                    <button
                      class="profile-link"
                      type="button"
                      @click="openProfileDialog(item)"
                    >
                      <span>{{ displayNameFor(item) || item.slug || item.user_id }}</span>
                      <span v-if="isAiProfile(item)" class="ai-badge">
                        <i class="mdi mdi-robot-outline ai-badge__icon" aria-hidden="true" />
                        {{ $t("components.homeProfiles.aiBadge") }}
                      </span>
                    </button>
                  </div>
                </div>
              </td>

              <td class="profiles-table__cell profiles-table__cell--muted">
                {{ taglineFor(item) || "—" }}
              </td>

              <td class="profiles-table__cell profiles-table__cell--numeric">
                {{ item.age ?? "—" }}
              </td>

              <td class="profiles-table__cell profiles-table__cell--numeric">
                <div class="profiles-table__metric">
                  <ButtonUpvote
                    :profile="item"
                    @upvoted="handleUpvoted"
                  />
                  <span>{{ item.upvote_count ?? 0 }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div v-else class="profiles-empty" role="status">
          {{ $t("components.homeProfiles.empty") }}
        </div>
      </div>

      <div v-else class="profiles-mobile-list">
        <div v-if="!displayedProfiles.length" class="profiles-empty" role="status">
          {{ $t("components.homeProfiles.empty") }}
        </div>

        <article
          v-for="item in displayedProfiles"
          :key="item.user_id || item.id"
          class="profile-card"
          role="button"
          tabindex="0"
          @click="openProfileDialog(item)"
          @keyup.enter="openProfileDialog(item)"
          @keyup.space.prevent="openProfileDialog(item)"
        >
          <div class="profile-card__body">
            <div class="avatar-stack avatar-stack--mobile">
              <img
                class="profile-avatar profile-avatar--mobile"
                :src="getAvatar(item.avatar_url, item.gender_id)"
                :alt="displayNameFor(item) || 'Profile avatar'"
              />
              <span v-if="item.country_emoji" class="avatar-flag">
                {{ item.country_emoji }}
              </span>
              <span v-if="item.has_email" class="registered-badge" aria-hidden="true">
                <i class="mdi mdi-star registered-badge__icon" />
              </span>
              <span class="gender-badge" aria-hidden="true">
                <i
                  :class="['mdi', getAvatarIcon(resolveGenderId(item)), 'profile-gender-icon']"
                  :style="{ '--profile-gender-color': getGenderHexColor(resolveGenderId(item)) }"
                />
              </span>
            </div>

            <div class="profile-card__content">
              <div class="profile-card__title-row">
                <span class="profile-link profile-link--static">
                  {{ displayNameFor(item) || item.slug || item.user_id }}
                </span>
                <span v-if="isAiProfile(item)" class="ai-badge">
                  <i class="mdi mdi-robot-outline ai-badge__icon" aria-hidden="true" />
                  {{ $t("components.homeProfiles.aiBadge") }}
                </span>
              </div>

              <div class="profile-tagline">
                <span v-if="taglineFor(item)">{{ taglineFor(item) }}</span>
                <span v-else class="tagline-placeholder">&nbsp;</span>
              </div>

              <div class="profile-meta-grid">
                <div class="meta-cell">
                  <i class="mdi mdi-cake-variant profile-meta-icon" aria-hidden="true" />
                  <span>{{ item.age ?? "—" }}</span>
                </div>
                <div class="meta-cell">
                  <span class="meta-cell__action" @click.stop>
                    <ButtonUpvote
                      :profile="item"
                      @upvoted="handleUpvoted"
                    />
                  </span>
                  <span>{{ item.upvote_count ?? 0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div
        v-if="hasMore"
        ref="infiniteScrollTrigger"
        class="profiles-scroll-trigger"
      />
    </div>
  </div>

  <ProfileDialog
    v-model="isProfileDialogOpen"
    :slug="profileDialogSlug"
    :user-id="profileDialogUserId"
    @upvoted="handleUpvoted"
  />
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useResponsiveDisplay } from "@/composables/useResponsiveDisplay";
import ProfileDialog from "@/components/ProfileDialog.vue";
import ButtonUpvote from "@/components/Button/Upvote.vue";
import {
  getAvatar,
  getAvatarIcon,
  getGenderHexColor,
} from "@/composables/useUserUtils";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const { t, locale } = useI18n();
const {
  getMostPopularAiProfiles,
  getMostPopularProfiles,
  getRecentProfiles,
  getRecentProfilesByGender,
  getProfileTranslationsForUsers,
} = useDb();

const props = defineProps({
  limit: {
    type: Number,
    default: 36,
  },
  gender: {
    type: String,
    default: "",
  },
  source: {
    type: String,
    default: "recent",
  },
  titleKey: {
    type: String,
    default: "",
  },
  subtitleKey: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["loaded"]);
const { smAndDown } = useResponsiveDisplay();
const isMounted = ref(false);
const useTableLayout = computed(() => !isMounted.value || !smAndDown.value);

onMounted(() => {
  isMounted.value = true;
  initObserver();
});

const INITIAL_VISIBLE_PROFILES = 18;
const loadedCount = ref(18);
const batchSize = 12;
const infiniteScrollTrigger = ref(null);
const isProfileDialogOpen = ref(false);
const profileDialogUserId = ref(null);
const profileDialogSlug = ref(null);

const headers = computed(() => [
  { title: t("components.homeProfiles.columns.profile"), key: "profile" },
  { title: t("components.homeProfiles.columns.tagline"), key: "tagline" },
  { title: t("components.homeProfiles.columns.age"), key: "age", numeric: true },
  { title: t("components.homeProfiles.columns.upvotes"), key: "upvotes", numeric: true },
]);

const isAiProfile = (profile) => {
  const value = profile?.is_ai;
  return value === true || value === "true" || value === 1;
};

const displayNameFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).displayname || profile?.displayname || "";

const taglineFor = (profile) =>
  resolveProfileLocalization({
    profile,
    readerLocale: locale?.value,
  }).tagline || profile?.tagline || "";

const resolveGenderId = (profile) => {
  if (profile?.gender_id) return profile.gender_id;
  const gender = typeof profile?.gender === "string" ? profile.gender.toLowerCase() : "";
  if (gender === "male") return 1;
  if (gender === "female") return 2;
  if (gender === "other" || gender === "non-binary" || gender === "nonbinary") return 3;
  return null;
};

const openProfileDialog = (profile) => {
  profileDialogUserId.value = profile?.user_id || profile?.id || null;
  profileDialogSlug.value = profile?.slug || null;
  isProfileDialogOpen.value = true;
};

const handleUpvoted = ({ userId, count }) => {
  if (!profilesData.value) return;
  profilesData.value = profilesData.value.map((p) =>
    p.user_id === userId ? { ...p, upvote_count: count } : p
  );
};

const displayedProfiles = computed(() => profiles.value.slice(0, loadedCount.value));

const hasMore = computed(() => loadedCount.value < profiles.value.length);
let observer = null;

const loadMoreProfiles = () => {
  if (!hasMore.value) return;
  loadedCount.value = Math.min(
    loadedCount.value + batchSize,
    profiles.value.length
  );
};

const loadProfiles = async () => {
  const genderId = resolveGenderId({ gender: props.gender });
  let data = [];
  if (props.source === "popular") {
    data = await getMostPopularProfiles(props.limit);
  } else if (props.source === "ai") {
    data = await getMostPopularAiProfiles(props.limit);
  } else if (props.gender) {
    data = await getRecentProfilesByGender(props.limit, genderId ?? null);
  } else {
    data = await getRecentProfiles(props.limit);
  }
  let next = Array.isArray(data) ? data : [];
  const userIds = next.map((p) => p?.user_id).filter(Boolean);
  if (userIds.length) {
    try {
      const { data: translations } =
        await getProfileTranslationsForUsers(userIds);
      const map = new Map();
      (translations || []).forEach((row) => {
        const key = row.user_id;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(row);
      });
      next = next.map((p) => ({
        ...p,
        profile_translations: map.get(p.user_id) || [],
      }));
    } catch (err) {
      console.warn("[HomeProfiles] translations failed:", err);
    }
  }
  return next;
};

const { data: profilesData, pending } = await useAsyncData(
  `home-profiles:${props.source}:${props.gender || "all"}:${props.limit}`,
  loadProfiles,
  { default: () => [] }
);

const profiles = computed(() =>
  Array.isArray(profilesData.value) ? profilesData.value : []
);

const isLoading = computed(
  () => pending.value && !profiles.value.length
);

watch(
  () => profiles.value.length,
  (len, prev = 0) => {
    if (!len) {
      loadedCount.value = 0;
      return;
    }
    if (prev === 0 || loadedCount.value === 0) {
      loadedCount.value = Math.min(INITIAL_VISIBLE_PROFILES, len);
      return;
    }
    loadedCount.value = Math.min(loadedCount.value, len);
  },
  { immediate: true }
);

const initObserver = async () => {
  if (!import.meta.client) return;
  if (observer || !profiles.value.length) return;
  await nextTick();
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) {
        loadMoreProfiles();
      }
    },
    { rootMargin: "140px" }
  );
  if (infiniteScrollTrigger.value) {
    observer.observe(infiniteScrollTrigger.value);
  }
};

watch(
  () => pending.value,
  (isPending) => {
    if (!isPending) {
      emit("loaded");
      initObserver();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<style scoped>
.home-profiles {
  width: 100%;
}

.home-profiles__intro {
  margin-bottom: 1rem;
}

.home-profiles__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  line-height: 1.4;
  color: rgb(var(--color-foreground));
}

.home-profiles__subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.95rem;
  line-height: 1.5;
  color: rgb(var(--color-foreground) / 0.68);
}

.profiles-table-shell {
  overflow-x: auto;
  border: 1px solid rgb(var(--color-border) / 0.78);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 16px 38px rgb(var(--color-shadow) / 0.08);
}

.profiles-table {
  width: 100%;
  border-collapse: collapse;
}

.profiles-table__head {
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgb(var(--color-border) / 0.72);
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-align: left;
  text-transform: uppercase;
  color: rgb(var(--color-foreground) / 0.62);
  background: rgb(var(--color-surface) / 0.96);
}

.profiles-table__head--numeric,
.profiles-table__cell--numeric {
  text-align: right;
}

.profiles-table__row {
  transition: background-color 160ms ease;
}

.profiles-table__row:hover {
  background: rgb(var(--color-foreground) / 0.025);
}

.profiles-table__row:not(:last-child) .profiles-table__cell {
  border-bottom: 1px solid rgb(var(--color-border) / 0.5);
}

.profiles-table__cell {
  padding: 1rem 1.25rem;
  vertical-align: middle;
  color: rgb(var(--color-foreground));
}

.profiles-table__cell--muted {
  color: rgb(var(--color-foreground) / 0.68);
}

.profiles-table__profile {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.profiles-table__profile-content {
  min-width: 0;
}

.profile-link {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  max-width: 100%;
  color: inherit;
  font: inherit;
  font-weight: 600;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.profile-link:hover {
  text-decoration: underline;
}

.profile-link--static {
  cursor: inherit;
}

.profile-link--static:hover {
  text-decoration: none;
}

.profiles-table__metric {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.35rem;
  min-width: 4rem;
}

.profiles-mobile-list {
  display: grid;
  gap: 0.9rem;
}

.profile-card {
  display: block;
  width: 100%;
  border: 1px solid rgb(var(--color-border) / 0.78);
  border-radius: 16px;
  background: rgb(var(--color-surface));
  box-shadow: 0 12px 30px rgb(var(--color-shadow) / 0.08);
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease;
}

.profile-card:hover,
.profile-card:focus-visible {
  transform: translateY(-1px);
  border-color: rgb(var(--color-primary) / 0.28);
  box-shadow: 0 16px 36px rgb(var(--color-shadow) / 0.12);
  outline: none;
}

.profile-card__body {
  display: flex;
  align-items: flex-start;
  gap: 0.9rem;
  padding: 1rem;
}

.profile-card__content {
  min-width: 0;
  flex: 1;
}

.profile-card__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.profile-tagline {
  min-height: 1.25rem;
  margin-top: 0.35rem;
  font-size: 0.95rem;
  line-height: 1.45;
  color: rgb(var(--color-foreground) / 0.68);
}

.tagline-placeholder {
  opacity: 0;
}

.profile-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, max-content));
  gap: 0.85rem;
  margin-top: 0.8rem;
}

.meta-cell {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.92rem;
  color: rgb(var(--color-foreground) / 0.78);
}

.profile-meta-icon {
  color: rgb(var(--color-foreground) / 0.52);
}

.avatar-stack {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
}

.profile-avatar {
  display: block;
  border-radius: 999px;
  object-fit: cover;
  background: rgb(var(--color-surface-2, var(--color-surface)));
}

.profile-avatar--desktop {
  width: 44px;
  height: 44px;
}

.profile-avatar--mobile {
  width: 48px;
  height: 48px;
}

.avatar-flag {
  position: absolute;
  right: -6px;
  top: 2px;
  font-size: 1.12rem;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(2, 6, 23, 0.75);
  z-index: 2;
}

.gender-badge {
  position: absolute;
  right: -8px;
  bottom: -8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  background: transparent;
}

.profile-gender-icon {
  font-size: 1.25rem;
  color: var(--profile-gender-color, #a855f7);
}

.registered-badge {
  position: absolute;
  left: -6px;
  top: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgb(var(--color-surface));
  box-shadow: 0 6px 12px rgb(var(--color-shadow) / 0.18);
}

.registered-badge__icon {
  font-size: 0.75rem;
  color: #d97706;
}

.ai-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  padding: 0.2rem 0.45rem;
  border-radius: 999px;
  background: rgb(76 29 149 / 0.12);
  color: rgb(76 29 149);
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.ai-badge__icon {
  font-size: 0.82rem;
}

.profile-upvote-icon {
  color: #d97706;
}

.profiles-empty {
  padding: 1rem 1.1rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 16px;
  background: rgb(var(--color-primary) / 0.06);
  color: rgb(var(--color-foreground) / 0.78);
}

.profiles-scroll-trigger {
  height: 1px;
}

@media (max-width: 959px) {
  .home-profiles__intro {
    margin-bottom: 0.9rem;
  }

  .home-profiles__title {
    font-size: 1.05rem;
  }

  .home-profiles__subtitle {
    font-size: 0.92rem;
  }
}
</style>
