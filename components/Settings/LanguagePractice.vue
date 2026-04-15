<template>
  <v-card class="mx-auto" flat>
    <v-card-text>
      <div class="text-subtitle-1 font-weight-medium mb-2">
        {{ $t("pages.settings.languagePractice.title") }}
      </div>
      <p class="text-body-2 text-medium-emphasis mb-4">
        {{ $t("pages.settings.languagePractice.subtitle") }}
      </p>

      <v-alert v-if="loadError" type="error" variant="tonal" class="mb-4" density="compact">
        {{ loadError }}
      </v-alert>

      <div v-if="authStore.user?.id">
        <div class="d-flex align-center flex-wrap">
          <v-switch
            v-model="form.is_active"
            inset
            color="primary"
            :label="$t('pages.settings.languagePractice.enabledLabel')"
            :disabled="loading || saving"
            hide-details
          />
        </div>

        <p class="text-caption text-medium-emphasis mb-4">
          {{ $t("pages.settings.languagePractice.localeHint") }}
        </p>

        <div class="language-settings-grid">
          <v-select
            v-model="form.native_language_code"
            :items="languageOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            clearable
            :disabled="loading || saving || !form.is_active"
            :label="$t('pages.languagePractice.nativeLanguage')"
            hide-details
          />
          <v-select
            v-model="form.target_language_code"
            :items="languageOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            clearable
            :disabled="loading || saving || !form.is_active"
            :label="$t('pages.languagePractice.targetLanguage')"
            hide-details
          />
          <v-select
            v-model="form.target_language_level"
            :items="levelOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            clearable
            :disabled="loading || saving || !form.is_active"
            :label="$t('pages.languagePractice.level')"
            hide-details
          />
          <v-select
            v-model="form.correction_preference"
            :items="correctionOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            :disabled="loading || saving || !form.is_active"
            :label="$t('pages.languagePractice.corrections')"
            hide-details
          />
          <v-select
            v-model="form.language_exchange_mode"
            :items="exchangeModeOptions"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            :disabled="loading || saving || !form.is_active"
            :label="$t('pages.languagePractice.mode')"
            hide-details
          />
        </div>

        <p v-if="!form.is_active" class="text-caption text-medium-emphasis mt-4 mb-0">
          {{ $t("pages.settings.languagePractice.inactiveHint") }}
        </p>

        <v-alert
          v-if="saveError"
          type="error"
          variant="tonal"
          class="mt-4"
          density="compact"
        >
          {{ saveError }}
        </v-alert>

        <v-alert
          v-else-if="saveSuccess"
          type="success"
          variant="tonal"
          class="mt-4"
          density="compact"
        >
          {{ saveSuccess }}
        </v-alert>

        <div class="d-flex justify-end mt-4">
          <v-btn
            color="primary"
            variant="flat"
            :loading="saving"
            :disabled="loading || saving || !isDirty"
            @click="savePreferences"
          >
            {{ $t("components.profile-container.save") }}
          </v-btn>
        </div>
      </div>

      <v-alert v-else type="info" variant="tonal">
        {{ $t("components.settings-container.loading") }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";
import { useLanguagePracticeProfile } from "@/composables/useLanguagePracticeProfile";

const { t } = useI18n();
const authStore = useAuthStore();
const {
  getDefaultLanguagePracticePreference,
  fetchLanguagePracticePreference,
  saveLanguagePracticePreference,
} = useLanguagePracticeProfile();

const loading = ref(true);
const saving = ref(false);
const loadError = ref("");
const saveError = ref("");
const saveSuccess = ref("");
const initialSnapshot = ref(JSON.stringify(getDefaultLanguagePracticePreference()));
const form = ref(getDefaultLanguagePracticePreference());

const languageOptions = computed(() => [
  { title: t("match.language.languages.en"), value: "en" },
  { title: t("match.language.languages.fr"), value: "fr" },
  { title: t("match.language.languages.ru"), value: "ru" },
  { title: t("match.language.languages.zh"), value: "zh" },
]);

const levelOptions = computed(() => [
  { title: t("pages.languagePractice.levels.unsure"), value: "unsure" },
  { title: t("pages.languagePractice.levels.a1"), value: "a1" },
  { title: t("pages.languagePractice.levels.a2"), value: "a2" },
  { title: t("pages.languagePractice.levels.b1"), value: "b1" },
  { title: t("pages.languagePractice.levels.b2"), value: "b2" },
  { title: t("pages.languagePractice.levels.c1"), value: "c1" },
  { title: t("pages.languagePractice.levels.c2"), value: "c2" },
]);

const correctionOptions = computed(() => [
  { title: t("match.language.correctionPreferences.no_corrections"), value: "no_corrections" },
  { title: t("match.language.correctionPreferences.light_corrections"), value: "light_corrections" },
  { title: t("match.language.correctionPreferences.active_corrections"), value: "active_corrections" },
]);

const exchangeModeOptions = computed(() => [
  { title: t("pages.languagePractice.exchangeModes.practice_only"), value: "practice_only" },
  { title: t("pages.languagePractice.exchangeModes.reciprocal_exchange"), value: "reciprocal_exchange" },
  { title: t("pages.languagePractice.exchangeModes.native_helper"), value: "native_helper" },
]);

const isDirty = computed(
  () => JSON.stringify(form.value) !== initialSnapshot.value
);

async function loadPreferences() {
  if (!authStore.user?.id) {
    loading.value = false;
    return;
  }

  loading.value = true;
  loadError.value = "";

  try {
    const preference = await fetchLanguagePracticePreference();
    form.value = { ...getDefaultLanguagePracticePreference(), ...preference };
    initialSnapshot.value = JSON.stringify(form.value);
  } catch (err) {
    loadError.value =
      err?.data?.statusMessage ||
      err?.data?.message ||
      t("pages.settings.languagePractice.loadError");
  } finally {
    loading.value = false;
  }
}

async function savePreferences() {
  saveError.value = "";
  saveSuccess.value = "";
  saving.value = true;

  try {
    const preference = await saveLanguagePracticePreference(form.value);
    form.value = { ...getDefaultLanguagePracticePreference(), ...preference };
    initialSnapshot.value = JSON.stringify(form.value);
    saveSuccess.value = t("pages.settings.languagePractice.saveSuccess");
  } catch (err) {
    saveError.value =
      err?.data?.statusMessage ||
      err?.data?.message ||
      t("pages.settings.languagePractice.saveError");
  } finally {
    saving.value = false;
  }
}

onMounted(loadPreferences);
</script>

<style scoped>
.language-settings-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 959px) {
  .language-settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
