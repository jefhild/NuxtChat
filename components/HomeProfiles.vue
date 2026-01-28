<template>
  <v-container>
    <LoadingContainer v-if="isLoading" />

    <div v-else>
      <div class="d-flex flex-column flex-md-row align-start align-md-center ga-4 mb-4">
        <div class="flex-1">
          <div class="text-h6 font-weight-medium">
            {{ $t("components.homeProfiles.title") }}
          </div>
          <div class="text-body-2 text-medium-emphasis">
            {{ $t("components.homeProfiles.subtitle") }}
          </div>
        </div>
      </div>

      <v-data-table
        v-if="!smAndDown"
        :headers="headers"
        :items="displayedProfiles"
        :items-per-page="-1"
        item-value="user_id"
        class="profiles-table"
        hover
        hide-default-footer
        :sort-by="[{ key: 'created', order: 'desc' }]"
        :no-data-text="$t('components.homeProfiles.empty')"
      >
        <template #item.profile="{ item }">
          <div class="d-flex align-center ga-3">
            <div class="avatar-stack">
              <v-avatar size="44">
                <v-img
                  :src="getAvatar(item.avatar_url, item.gender_id)"
                  :alt="displayNameFor(item) || 'Profile avatar'"
                />
              </v-avatar>
              <v-avatar v-if="item.has_email" size="18" class="registered-badge">
                <v-icon size="12" color="amber-darken-2">mdi-star</v-icon>
              </v-avatar>
              <v-avatar size="30" class="gender-badge">
                <v-icon
                  size="20"
                  :color="getGenderColor(resolveGenderId(item))"
                  :icon="getAvatarIcon(resolveGenderId(item))"
                />
              </v-avatar>
            </div>
            <div class="d-flex flex-column">
              <button
                class="profile-link d-flex align-center ga-2"
                type="button"
                @click="openProfileDialog(item)"
              >
                {{ displayNameFor(item) || item.slug || item.user_id }}
                <v-chip
                  v-if="isAiProfile(item)"
                  size="x-small"
                  color="deep-purple-darken-3"
                  text-color="white"
                  variant="tonal"
                >
                  <v-icon size="14" class="mr-1">mdi-robot-outline</v-icon>
                  {{ $t("components.homeProfiles.aiBadge") }}
                </v-chip>
              </button>
            </div>
          </div>
        </template>

        <template #item.tagline="{ item }">
          <span class="text-body-2 text-medium-emphasis">{{ taglineFor(item) || "—" }}</span>
        </template>

        <template #item.age="{ item }">
          <span class="text-body-2">{{ item.age ?? "—" }}</span>
        </template>

        <template #item.country="{ item }">
          <span class="text-body-2">{{ item.country_emoji || "—" }}</span>
        </template>

        <template #item.comment_count="{ item }">
          <div class="d-flex align-center justify-end ga-1">
            <v-icon size="16" color="blue-grey-darken-1">mdi-chat-outline</v-icon>
            <span class="text-body-2">{{ item.comment_count ?? 0 }}</span>
          </div>
        </template>

        <template #item.upvotes="{ item }">
          <div class="d-flex align-center justify-end ga-1">
            <v-icon size="16" color="amber-darken-2">mdi-thumb-up</v-icon>
            <span class="text-body-2">{{ item.upvote_count ?? 0 }}</span>
          </div>
        </template>
      </v-data-table>

      <div v-else>
        <v-alert
          v-if="!displayedProfiles.length"
          variant="tonal"
          type="info"
          class="mb-3"
        >
          {{ $t("components.homeProfiles.empty") }}
        </v-alert>

        <v-row dense>
          <v-col
            v-for="item in displayedProfiles"
            :key="item.user_id || item.id"
            cols="12"
          >
            <v-card
              class="profile-card"
              elevation="0"
              border
              role="button"
              tabindex="0"
              @click="openProfileDialog(item)"
              @keyup.enter="openProfileDialog(item)"
            >
              <v-card-text class="d-flex align-start ga-3">
                <div class="avatar-stack">
                  <v-avatar size="48">
                    <v-img
                      :src="getAvatar(item.avatar_url, item.gender_id)"
                      :alt="displayNameFor(item) || 'Profile avatar'"
                    />
                  </v-avatar>
                  <v-avatar v-if="item.has_email" size="18" class="registered-badge">
                    <v-icon size="12" color="amber-darken-2">mdi-star</v-icon>
                  </v-avatar>
                  <v-avatar size="28" class="gender-badge">
                    <v-icon
                      size="18"
                      :color="getGenderColor(resolveGenderId(item))"
                      :icon="getAvatarIcon(resolveGenderId(item))"
                    />
                  </v-avatar>
                </div>

                <div class="flex-1">
                  <div class="profile-link d-flex align-center ga-2">
                    {{ displayNameFor(item) || item.slug || item.user_id }}
                    <v-chip
                      v-if="isAiProfile(item)"
                      size="x-small"
                      color="deep-purple-darken-3"
                      text-color="white"
                      variant="tonal"
                    >
                      <v-icon size="14" class="mr-1">mdi-robot-outline</v-icon>
                      {{ $t("components.homeProfiles.aiBadge") }}
                    </v-chip>
                  </div>
                  <div class="profile-tagline text-body-2 text-medium-emphasis mt-1">
                    <span v-if="taglineFor(item)">{{ taglineFor(item) }}</span>
                    <span v-else class="tagline-placeholder">&nbsp;</span>
                  </div>
                  <div class="profile-meta-grid mt-2">
                    <div class="meta-cell">
                      <v-icon size="16" color="blue-grey-darken-1">mdi-cake-variant</v-icon>
                      <span>{{ item.age ?? "—" }}</span>
                    </div>
                    <div class="meta-cell">
                      <v-icon size="16" color="blue-grey-darken-1">mdi-map-marker</v-icon>
                      <span class="country-flag">{{ item.country_emoji || "—" }}</span>
                    </div>
                    <div class="meta-cell">
                      <v-icon size="16" color="blue-grey-darken-1">mdi-chat-outline</v-icon>
                      <span>{{ item.comment_count ?? 0 }}</span>
                    </div>
                    <div class="meta-cell">
                      <v-icon size="16" color="amber-darken-2">mdi-thumb-up</v-icon>
                      <span>{{ item.upvote_count ?? 0 }}</span>
                    </div>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </div>

      <div
        v-if="hasMore"
        ref="infiniteScrollTrigger"
        class="profiles-scroll-trigger"
      />
    </div>
  </v-container>

  <ProfileDialog
    v-model="isProfileDialogOpen"
    :slug="profileDialogSlug"
    :user-id="profileDialogUserId"
  />
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useDisplay } from "vuetify";
import ProfileDialog from "@/components/ProfileDialog.vue";
import {
  getAvatar,
  getAvatarIcon,
  getGenderColor,
} from "@/composables/useUserUtils";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const { t, locale } = useI18n();
const { getRecentProfilesByGender, getProfileTranslationsForUsers } = useDb();

const props = defineProps({
  limit: {
    type: Number,
    default: 36,
  },
  gender: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(["loaded"]);
const { smAndDown } = useDisplay();

const isLoading = ref(true);
const profiles = ref([]);
const loadedCount = ref(18);
const batchSize = 12;
const infiniteScrollTrigger = ref(null);
const isProfileDialogOpen = ref(false);
const profileDialogUserId = ref(null);
const profileDialogSlug = ref(null);

const headers = computed(() => [
  { title: t("components.homeProfiles.columns.profile"), key: "profile", sortable: false },
  { title: t("components.homeProfiles.columns.tagline"), key: "tagline", width: 220, sortable: false },
  { title: t("components.homeProfiles.columns.age"), key: "age", align: "end", width: 72, sortable: false },
  { title: t("components.homeProfiles.columns.country"), key: "country", width: 140, sortable: false },
  { title: t("components.homeProfiles.columns.comments"), key: "comment_count", align: "end", width: 120 },
  { title: t("components.homeProfiles.columns.upvotes"), key: "upvotes", align: "end", width: 100 },
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

const displayedProfiles = computed(() => {
  return profiles.value.slice(0, loadedCount.value);
});

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
  return getRecentProfilesByGender(props.limit, genderId ?? null);
};

onMounted(async () => {
  const data = await loadProfiles();
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
  profiles.value = next;
  loadedCount.value = Math.min(loadedCount.value, profiles.value.length || 0);
  isLoading.value = false;
  emit("loaded");

  if (!profiles.value.length) return;

  await nextTick();

  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        loadMoreProfiles();
      }
    },
    { rootMargin: "140px" }
  );

  if (infiniteScrollTrigger.value) {
    observer.observe(infiniteScrollTrigger.value);
  }

});

onUnmounted(() => {
  observer?.disconnect();
  observer = null;
});
</script>

<style scoped>
.profiles-table :deep(th) {
  font-weight: 600;
}

.profiles-table :deep(td) {
  vertical-align: middle;
}

.profiles-table :deep(.v-table__wrapper) {
  overflow: visible;
}

.profile-link {
  color: inherit;
  font: inherit;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  text-align: left;
}

.profile-link:hover {
  text-decoration: underline;
}

.profile-card {
  border-radius: 14px;
  cursor: pointer;
}

.profile-meta {
  row-gap: 6px;
  width: 100%;
}

.profile-tagline {
  min-height: 20px;
}

.tagline-placeholder {
  opacity: 0;
}

.profile-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.meta-cell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
}

.country-flag {
  font-size: 18px;
  line-height: 1;
}

.avatar-stack {
  position: relative;
  display: inline-flex;
}

.gender-badge {
  position: absolute;
  right: -8px;
  bottom: -8px;
  background: transparent;
}

.registered-badge {
  position: absolute;
  left: -6px;
  top: -6px;
  background: transparent;
}

.profiles-scroll-trigger {
  height: 1px;
}
</style>
