<template>
  <div>
    <section class="settings-chat-card mx-auto">
      <div class="settings-chat-card__title">
        {{ t("components.chat-settings.title", "Site Settings") }}
      </div>
      <p class="settings-chat-card__subtitle">
        {{
          t(
            "components.chat-settings.subtitle",
            "Control your site and chat preferences."
          )
        }}
      </p>

      <div v-if="!authStore.user?.id" class="settings-status-alert settings-status-alert--info">
        {{ t("components.settings-container.registered-only") }}
      </div>

      <div v-else>
        <p v-if="loading" class="settings-chat-card__loading">
          {{ t("components.settings-container.loading") }}
        </p>
        <div class="settings-row settings-row--wrap">
          <div class="settings-row__label">
            {{ t("components.chat-settings.theme", "Theme") }}
          </div>
          <div class="settings-choice-group">
            <button
              type="button"
              class="settings-choice-btn"
              :class="{ 'is-active': themeMode === 'system' }"
              @click="setThemeMode('system')"
            >
              {{ t("components.chat-settings.theme-system", "System") }}
            </button>
            <button
              type="button"
              class="settings-choice-btn"
              :class="{ 'is-active': themeMode === 'light' }"
              @click="setThemeMode('light')"
            >
              {{ t("components.chat-settings.theme-light", "Light") }}
            </button>
            <button
              type="button"
              class="settings-choice-btn"
              :class="{ 'is-active': themeMode === 'dark' }"
              @click="setThemeMode('dark')"
            >
              {{ t("components.chat-settings.theme-dark", "Dark") }}
            </button>
          </div>
          <span
            class="settings-info-icon"
            :title="t('components.chat-settings.theme-helper', 'Pick System to follow your device, or force Light/Dark for this browser.')"
            :aria-label="t('components.chat-settings.theme-helper', 'Pick System to follow your device, or force Light/Dark for this browser.')"
          >
            <i class="mdi mdi-information-outline" aria-hidden="true" />
          </span>
        </div>

        <div class="settings-row settings-row--wrap">
          <div class="settings-row__label">
            {{ t("components.chat-settings.profile-card-theme", "Profile card theme") }}
          </div>
          <select
            v-model="cardThemeSelection"
            class="profile-card-theme-select"
            :disabled="saving || loading || !profile"
            @change="saveProfileCardTheme(cardThemeSelection)"
          >
            <option
              v-for="option in cardThemeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <button
            type="button"
            class="settings-outline-btn"
            :disabled="loading || !profile"
            @click="previewOpen = true"
          >
            <i class="mdi mdi-eye-outline" aria-hidden="true" />
            {{ t("components.chat-settings.preview", "Preview") }}
          </button>
        </div>

        <div class="settings-row">
          <label class="settings-switch">
            <input
              :checked="moodFeedPromptEnabled"
              type="checkbox"
              :disabled="saving || loading || !profile"
              @change="toggleMoodFeed($event.target.checked)"
            >
            <span>{{ t('components.chat-settings.mood-question', 'Daily mood question') }}</span>
          </label>
          <span
            class="settings-info-icon"
            :title="t('components.chat-settings.mood-question-helper', 'Let ImChatty ask you a daily mood question in chat.')"
            :aria-label="t('components.chat-settings.mood-question-helper', 'Let ImChatty ask you a daily mood question in chat.')"
          >
            <i class="mdi mdi-information-outline" aria-hidden="true" />
          </span>
        </div>

        <p v-if="moodFeedSnoozeLabel" class="settings-row__helper">
          {{ moodFeedSnoozeLabel }}
        </p>

        <button
          type="button"
          class="settings-outline-btn mt-2"
          :disabled="saving || loading || !profile || !moodFeedPromptEnabled"
          @click="snoozeMoodFeed"
        >
          {{ t("components.chat-settings.snooze", "Snooze 7 days") }}
        </button>

        <div v-if="isAuthenticated" class="settings-row">
          <label class="settings-switch">
            <input
              :checked="profilePrivate"
              type="checkbox"
              :disabled="saving || loading || !profile"
              @change="toggleProfilePrivacy($event.target.checked)"
            >
            <span>{{ t('components.profile-language.private_label') }}</span>
          </label>
          <span
            class="settings-info-icon"
            :title="t('components.profile-language.private_helper')"
            :aria-label="t('components.profile-language.private_helper')"
          >
            <i class="mdi mdi-information-outline" aria-hidden="true" />
          </span>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="profile-preview-fade">
        <div v-if="previewOpen && previewProfile" class="profile-preview-dialog" role="presentation">
          <button
            type="button"
            class="profile-preview-dialog__scrim"
            aria-label="Close profile preview"
            @click="previewOpen = false"
          />
          <div class="profile-preview-dialog__panel">
            <ProfileCard
              :profile="previewProfile"
              :stats="previewStats"
              :theme-override="cardThemeSelection"
              :gallery-blurred="previewGalleryBlurred"
              :photo-gallery-count="previewGalleryCount"
              :photo-gallery-photos="previewGalleryPhotos"
              @chat-now="previewOpen = false"
            >
              <template #overlay>
                <button
                  type="button"
                  aria-label="Close profile preview"
                  class="profile-preview-close"
                  @click="previewOpen = false"
                >
                  <i class="mdi mdi-close" aria-hidden="true" />
                </button>
              </template>
            </ProfileCard>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";
import ProfileCard from "@/components/ProfileCard.vue";

const { t } = useI18n();
const authStore = useAuthStore();
const { getUserProfileFromId, updateProfile } = useDb();
const { mode: themeModeState, applyThemeMode } = useAppTheme();

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

const applyThemePreference = (nextThemeMode) => {
  const normalizedMode = normalizeThemeMode(nextThemeMode);
  applyThemeMode(normalizedMode);
  themeMode.value = normalizedMode;
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
  const initialMode = normalizeThemeMode(themeModeState.value);
  themeMode.value = initialMode;
  applyThemePreference(initialMode);
});

watch(
  () => themeModeState.value,
  () => {
    themeMode.value = normalizeThemeMode(themeModeState.value);
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
.settings-chat-card {
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface) / 0.96);
}

.settings-chat-card__title {
  margin-bottom: 0.5rem;
  font-size: 1rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.settings-chat-card__subtitle,
.settings-chat-card__loading,
.settings-row__helper {
  color: rgb(var(--color-foreground) / 0.72);
  line-height: 1.6;
}

.settings-chat-card__subtitle {
  margin: 0 0 1rem;
  font-size: 0.95rem;
}

.settings-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

.settings-row--wrap {
  flex-wrap: wrap;
}

.settings-row__label {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgb(var(--color-foreground) / 0.86);
}

.settings-row__helper {
  margin: 0.4rem 0 0;
  font-size: 0.8rem;
}

.settings-choice-group {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.settings-choice-btn,
.settings-outline-btn,
.profile-preview-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.25rem;
  padding: 0.55rem 0.8rem;
  border-radius: 10px;
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
}

.settings-choice-btn {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.settings-choice-btn.is-active {
  border-color: rgb(var(--color-primary) / 0.4);
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-foreground));
}

.settings-outline-btn {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.settings-choice-btn:hover,
.settings-choice-btn:focus-visible,
.settings-outline-btn:hover,
.settings-outline-btn:focus-visible,
.profile-preview-close:hover,
.profile-preview-close:focus-visible {
  outline: none;
  background: rgb(var(--color-primary) / 0.08);
}

.settings-choice-btn:disabled,
.settings-outline-btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.settings-switch {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: rgb(var(--color-foreground) / 0.86);
}

.settings-switch input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.2rem;
  accent-color: rgb(var(--color-primary));
}

.settings-info-icon {
  display: inline-flex;
  align-items: center;
  color: rgb(var(--color-foreground) / 0.52);
}

.profile-card-theme-select {
  min-width: 220px;
  max-width: 300px;
  min-height: 40px;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 10px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font: inherit;
}

.settings-status-alert {
  padding: 0.8rem 0.95rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9rem;
}

.settings-status-alert--info {
  background: rgb(var(--color-info) / 0.12);
  border-color: rgb(var(--color-info) / 0.22);
  color: rgb(var(--color-info));
}

.profile-preview-dialog {
  position: fixed;
  inset: 0;
  z-index: 2300;
}

.profile-preview-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.72);
}

.profile-preview-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(92vw, 920px);
  max-height: calc(100vh - 2rem);
  overflow: auto;
  transform: translate(-50%, -50%);
}

.profile-preview-close {
  position: absolute;
  top: 6px;
  right: 6px;
  z-index: 2;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
}

.profile-preview-fade-enter-active,
.profile-preview-fade-leave-active {
  transition: opacity 160ms ease;
}

.profile-preview-fade-enter-from,
.profile-preview-fade-leave-to {
  opacity: 0;
}
</style>
