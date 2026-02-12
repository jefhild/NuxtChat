<template>
  <v-card class="mx-auto" flat>
    <v-card-text>
      <div class="text-subtitle-1 font-weight-medium mb-2">
        {{ t("components.chat-settings.title", "Chat Settings") }}
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{
          t(
            "components.chat-settings.subtitle",
            "Control how ImChatty interacts with you in chat."
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
        <div class="d-flex align-center">
          <v-switch
            inset
            class="mt-2"
            :disabled="saving || loading || !profile"
            :model-value="moodFeedPromptEnabled"
            :label="t('components.chat-settings.mood-question', 'Daily mood question')"
            @update:modelValue="toggleMoodFeed"
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
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useDb } from "@/composables/useDB";

const { t } = useI18n();
const authStore = useAuthStore();
const { getUserProfileFromId, updateProfile } = useDb();

const loading = ref(true);
const saving = ref(false);
const profile = ref(null);

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
    if (profile.value?.mood_feed_prompt_enabled == null) {
      profile.value.mood_feed_prompt_enabled = true;
    }
    if (profile.value?.mood_feed_prompt_snooze_until === undefined) {
      profile.value.mood_feed_prompt_snooze_until = null;
    }
  } catch (err) {
    console.warn("[chat-settings] load profile failed:", err);
  } finally {
    loading.value = false;
  }
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

onMounted(loadProfile);
</script>
