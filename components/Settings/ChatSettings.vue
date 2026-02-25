<template>
  <div>
    <v-card class="mx-auto" flat>
    <v-card-text>
      <div class="text-subtitle-1 font-weight-medium mb-2">
        {{ t("components.chat-settings.title", "Site Settings") }}
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{
          t(
            "components.chat-settings.subtitle",
            "Control your site and chat preferences."
          )
        }}
      </p>

      <v-alert v-if="!authStore.user?.id" type="info" variant="tonal">
        {{ t("components.settings-container.registered-only") }}
      </v-alert>

      <div v-else>
        <p v-if="loading" class="text-body-2 text-medium-emphasis mb-2">
          {{ t("components.settings-container.loading") }}
        </p>
        <div class="d-flex align-center flex-wrap">
          <div class="text-body-2 font-weight-medium mr-3">
            {{ t("components.chat-settings.theme", "Theme") }}
          </div>
          <v-btn-toggle
            :model-value="themeMode"
            density="comfortable"
            mandatory
            variant="outlined"
            color="primary"
            @update:model-value="setThemeMode"
          >
            <v-btn value="system" size="small">
              {{ t("components.chat-settings.theme-system", "System") }}
            </v-btn>
            <v-btn value="light" size="small">
              {{ t("components.chat-settings.theme-light", "Light") }}
            </v-btn>
            <v-btn value="dark" size="small">
              {{ t("components.chat-settings.theme-dark", "Dark") }}
            </v-btn>
          </v-btn-toggle>
          <v-tooltip
            :text="t('components.chat-settings.theme-helper', 'Pick System to follow your device, or force Light/Dark for this browser.')"
            location="top"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                size="18"
                class="ml-2 mb-1 text-medium-emphasis"
                v-bind="tooltipProps"
              >
                mdi-information-outline
              </v-icon>
            </template>
          </v-tooltip>
        </div>

        <div class="d-flex align-center flex-wrap mt-4">
          <div class="text-body-2 font-weight-medium mr-3">
            {{ t("components.chat-settings.profile-card-theme", "Profile card theme") }}
          </div>
          <v-select
            v-model="cardThemeSelection"
            :items="cardThemeOptions"
            item-title="label"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            class="profile-card-theme-select"
            :disabled="saving || loading || !profile"
            @update:model-value="saveProfileCardTheme"
          />
          <v-btn
            class="ml-2"
            size="small"
            variant="outlined"
            prepend-icon="mdi-eye-outline"
            :disabled="loading || !profile"
            @click="previewOpen = true"
          >
            {{ t("components.chat-settings.preview", "Preview") }}
          </v-btn>
        </div>

        <div class="d-flex align-center">
          <v-switch
            inset
            class="mt-2"
            :disabled="saving || loading || !profile"
            :model-value="moodFeedPromptEnabled"
            :label="t('components.chat-settings.mood-question', 'Daily mood question')"
            @update:model-value="toggleMoodFeed"
          />
          <v-tooltip
            :text="t('components.chat-settings.mood-question-helper', 'Let ImChatty ask you a daily mood question in chat.')"
            location="top"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                size="18"
                class="ml-2 mb-1 text-medium-emphasis"
                v-bind="tooltipProps"
              >
                mdi-information-outline
              </v-icon>
            </template>
          </v-tooltip>
        </div>

        <p v-if="moodFeedSnoozeLabel" class="text-caption text-medium-emphasis">
          {{ moodFeedSnoozeLabel }}
        </p>

        <v-btn
          class="mt-2"
          variant="outlined"
          size="small"
          :disabled="saving || loading || !profile || !moodFeedPromptEnabled"
          @click="snoozeMoodFeed"
        >
          {{ t("components.chat-settings.snooze", "Snooze 7 days") }}
        </v-btn>

        <div v-if="isAuthenticated" class="d-flex align-center mt-3">
          <v-switch
            inset
            class="mt-2"
            :disabled="saving || loading || !profile"
            :model-value="profilePrivate"
            :label="t('components.profile-language.private_label')"
            @update:model-value="toggleProfilePrivacy"
          />
          <v-tooltip
            :text="t('components.profile-language.private_helper')"
            location="top"
          >
            <template #activator="{ props: tooltipProps }">
              <v-icon
                size="18"
                class="ml-2 mb-1 text-medium-emphasis"
                v-bind="tooltipProps"
              >
                mdi-information-outline
              </v-icon>
            </template>
          </v-tooltip>
        </div>
      </div>
    </v-card-text>
    </v-card>

    <v-dialog v-model="previewOpen" max-width="920" width="92vw">
      <ProfileCard
        v-if="previewProfile"
        :profile="previewProfile"
        :stats="previewStats"
        :theme-override="cardThemeSelection"
        :gallery-blurred="previewGalleryBlurred"
        :photo-gallery-count="previewGalleryCount"
        :photo-gallery-photos="previewGalleryPhotos"
        @chat-now="previewOpen = false"
      >
        <template #overlay>
          <v-btn
            icon="mdi-close"
            size="small"
            variant="text"
            aria-label="Close profile preview"
            class="profile-preview-close"
            @click="previewOpen = false"
          />
        </template>
      </ProfileCard>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";
import { useTheme } from "vuetify";
import ProfileCard from "@/components/ProfileCard.vue";

const { t } = useI18n();
const authStore = useAuthStore();
const { getUserProfileFromId, updateProfile } = useDb();
const vuetifyTheme = useTheme();
const themeCookie = useCookie("imchatty_theme", {
  sameSite: "lax",
  path: "/",
});

const loading = ref(true);
const saving = ref(false);
const profile = ref(null);
const themeMode = ref("system");
const previewOpen = ref(false);
const previewGalleryPhotos = ref([]);
const previewGalleryCount = ref(0);
const previewStats = ref(null);
const cardThemeSelection = ref("trading");
const isAuthenticated = computed(() => authStore.authStatus === "authenticated");
const previewGalleryBlurred = computed(() => !isAuthenticated.value);
const profilePrivate = computed(() => Boolean(profile.value?.is_private));
const cardThemeOptions = computed(() => [
  {
    value: "trading",
    label: t("components.chat-settings.profile-card-theme-trading", "Trading Card"),
  },
  {
    value: "vintage",
    label: t("components.chat-settings.profile-card-theme-vintage", "Vintage Collector"),
  },
  {
    value: "holo",
    label: t("components.chat-settings.profile-card-theme-holo", "Holographic Neon"),
  },
]);
const previewProfile = computed(() => {
  if (!profile.value) return null;
  return {
    ...profile.value,
    profile_card_theme: cardThemeSelection.value || "trading",
    looking_for: Array.isArray(profile.value.looking_for)
      ? profile.value.looking_for
      : ["Love"],
  };
});

const normalizeTheme = (value) =>
  value === "dark" || value === "light" || value === "system"
    ? value
    : "system";
const resolveSystemTheme = () => {
  if (!import.meta.client) return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const setThemeNameSafe = (nextThemeName) => {
  if (!nextThemeName) return;
  if (typeof vuetifyTheme?.change === "function") {
    vuetifyTheme.change(nextThemeName);
    return;
  }
  if (typeof vuetifyTheme?.global?.change === "function") {
    vuetifyTheme.global.change(nextThemeName);
    return;
  }
  if (vuetifyTheme?.global?.name) {
    vuetifyTheme.global.name.value = nextThemeName;
  }
};

const applyThemePreference = (nextThemeMode) => {
  const normalizedMode = normalizeTheme(nextThemeMode);
  const effectiveTheme =
    normalizedMode === "system" ? resolveSystemTheme() : normalizedMode;
  setThemeNameSafe(effectiveTheme);
  themeMode.value = normalizedMode;
  themeCookie.value = normalizedMode;
  if (import.meta.client) {
    document.documentElement.style.colorScheme = effectiveTheme;
  }
};

const setThemeMode = (nextMode) => {
  if (!nextMode) return;
  applyThemePreference(nextMode);
};

const moodFeedPromptEnabled = computed(
  () => profile.value?.mood_feed_prompt_enabled !== false
);

const moodFeedSnoozeLabel = computed(() => {
  const raw = profile.value?.mood_feed_prompt_snooze_until;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  const date = d.toLocaleDateString();
  const label = t("components.chat-settings.snoozed", { date });
  return label === "components.chat-settings.snoozed"
    ? `Snoozed until ${date}`
    : label;
});

const loadProfile = async () => {
  const userId = authStore.user?.id;
  if (!userId) {
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const { data } = await getUserProfileFromId(userId);
    profile.value = data || null;
    if (profile.value?.is_private == null) {
      profile.value.is_private = false;
    }
    if (profile.value?.mood_feed_prompt_enabled == null) {
      profile.value.mood_feed_prompt_enabled = true;
    }
    if (profile.value?.mood_feed_prompt_snooze_until === undefined) {
      profile.value.mood_feed_prompt_snooze_until = null;
    }
    if (!profile.value?.profile_card_theme) {
      profile.value.profile_card_theme = "trading";
    }
    cardThemeSelection.value = profile.value.profile_card_theme;
  } catch (err) {
    console.warn("[chat-settings] load profile failed:", err);
  } finally {
    loading.value = false;
  }
};

const loadPreviewGallery = async () => {
  if (!isAuthenticated.value || !profile.value?.user_id) {
    previewGalleryPhotos.value = [];
    previewGalleryCount.value = 0;
    return;
  }
  try {
    const result = await $fetch("/api/profile/photos");
    const items = Array.isArray(result?.photos) ? result.photos : [];
    previewGalleryPhotos.value = items;
    previewGalleryCount.value = items.filter((item) => item?.status === "approved").length;
  } catch (err) {
    console.warn("[chat-settings] load preview gallery failed:", err);
    previewGalleryPhotos.value = [];
    previewGalleryCount.value = 0;
  }
};

const loadPreviewStats = async () => {
  const userId = profile.value?.user_id || profile.value?.id;
  if (!userId) {
    previewStats.value = null;
    return;
  }
  try {
    previewStats.value = await $fetch("/api/profile/stats", {
      query: { userId },
    });
  } catch (err) {
    console.warn("[chat-settings] load preview stats failed:", err);
    previewStats.value = null;
  }
};

const normalizeCardTheme = (value) => {
  const key = String(value || "").trim().toLowerCase();
  if (["trading", "vintage", "holo"].includes(key)) return key;
  return "trading";
};

const savePrefs = async (nextEnabled, nextSnoozeUntil) => {
  if (!profile.value?.user_id) return;
  saving.value = true;
  try {
    await updateProfile(
      profile.value.user_id,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      nextEnabled,
      nextSnoozeUntil
    );
    profile.value.mood_feed_prompt_enabled = nextEnabled;
    profile.value.mood_feed_prompt_snooze_until = nextSnoozeUntil;
  } catch (err) {
    console.error("[chat-settings] save failed:", err);
  } finally {
    saving.value = false;
  }
};

const toggleMoodFeed = async (val) => {
  const enabled = !!val;
  const snooze = enabled ? profile.value?.mood_feed_prompt_snooze_until : null;
  await savePrefs(enabled, snooze || null);
};

const snoozeMoodFeed = async () => {
  const now = new Date();
  const snoozeUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  await savePrefs(true, snoozeUntil.toISOString());
};

const toggleProfilePrivacy = async (val) => {
  if (!profile.value?.user_id || !isAuthenticated.value) return;
  const next = Boolean(val);
  saving.value = true;
  try {
    await updateProfile(
      profile.value.user_id,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      next,
      undefined,
      undefined
    );
    profile.value.is_private = next;
    if (authStore.userProfile) {
      authStore.userProfile.is_private = next;
    }
  } catch (err) {
    console.error("[chat-settings] privacy save failed:", err);
  } finally {
    saving.value = false;
  }
};

const saveProfileCardTheme = async (themeValue) => {
  if (!profile.value?.user_id) return;
  const normalizedTheme = normalizeCardTheme(themeValue);
  cardThemeSelection.value = normalizedTheme;
  if (profile.value.profile_card_theme === normalizedTheme) return;

  saving.value = true;
  try {
    await updateProfile(
      profile.value.user_id,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      normalizedTheme
    );
    profile.value.profile_card_theme = normalizedTheme;
    if (authStore.userProfile) {
      authStore.userProfile.profile_card_theme = normalizedTheme;
    }
  } catch (err) {
    console.error("[chat-settings] profile card theme save failed:", err);
    cardThemeSelection.value = profile.value.profile_card_theme || "trading";
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await loadProfile();
  await loadPreviewGallery();
  await loadPreviewStats();
  const initialMode = normalizeTheme(themeCookie.value);
  themeMode.value = initialMode;
  applyThemePreference(initialMode);
});

watch(
  () => [vuetifyTheme?.global?.name?.value, themeCookie.value],
  () => {
    themeMode.value = normalizeTheme(themeCookie.value);
  }
);

watch(
  () => [authStore.authStatus, profile.value?.user_id],
  async () => {
    await loadPreviewGallery();
    await loadPreviewStats();
  }
);
</script>

<style scoped>
.profile-card-theme-select {
  min-width: 220px;
  max-width: 300px;
}

.profile-preview-close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
}
</style>
