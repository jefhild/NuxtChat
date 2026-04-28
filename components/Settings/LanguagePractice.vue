<template>
  <section class="language-practice-settings">
    <header class="language-practice-settings__header">
      <h2 class="language-practice-settings__title">
        {{ $t("pages.settings.languagePractice.title") }}
      </h2>
      <p class="language-practice-settings__subtitle">
        {{ $t("pages.settings.languagePractice.subtitle") }}
      </p>
    </header>

    <div
      v-if="loadError"
      class="language-practice-settings__feedback language-practice-settings__feedback--error"
      role="alert"
    >
      {{ loadError }}
    </div>

    <div v-if="authStore.user?.id" class="language-practice-settings__content">
      <label class="language-practice-settings__toggle">
        <input
          v-model="form.is_active"
          type="checkbox"
          class="language-practice-settings__toggle-input"
          :disabled="loading || saving"
        >
        <span class="language-practice-settings__toggle-track" aria-hidden="true">
          <span class="language-practice-settings__toggle-thumb" />
        </span>
        <span class="language-practice-settings__toggle-label">
          {{ $t("pages.settings.languagePractice.enabledLabel") }}
        </span>
      </label>

      <p class="language-practice-settings__hint">
        {{ $t("pages.settings.languagePractice.localeHint") }}
      </p>

      <div class="language-settings-grid">
        <label class="language-practice-settings__field">
          <span class="language-practice-settings__field-label">
            {{ $t("pages.languagePractice.nativeLanguage") }}
          </span>
          <select
            v-model="form.native_language_code"
            class="language-practice-settings__select"
            :disabled="loading || saving || !form.is_active"
          >
            <option value="">
              {{ $t("pages.settings.languagePractice.useSiteLanguage", "Use my site language") }}
            </option>
            <option
              v-for="option in languageOptions"
              :key="`native-${option.value}`"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
        </label>

        <label class="language-practice-settings__field">
          <span class="language-practice-settings__field-label">
            {{ $t("pages.settings.languagePractice.primaryTargetLanguage", "Main language I want to practice") }}
          </span>
          <select
            v-model="form.target_language_code"
            class="language-practice-settings__select"
            :disabled="loading || saving || !form.is_active"
          >
            <option value="">
              {{ $t("pages.settings.languagePractice.anyTargetLanguage", "No specific preference") }}
            </option>
            <option
              v-for="option in languageOptions"
              :key="`target-${option.value}`"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
          <span class="language-practice-settings__hint">
            {{
              $t(
                "pages.settings.languagePractice.targetLanguageHint",
                "Choose one main practice language here, or leave it blank if you're open to any supported language."
              )
            }}
          </span>
        </label>

        <label class="language-practice-settings__field">
          <span class="language-practice-settings__field-label">
            {{ $t("pages.languagePractice.level") }}
          </span>
          <select
            v-model="form.target_language_level"
            class="language-practice-settings__select"
            :disabled="loading || saving || !form.is_active"
          >
            <option value="">
              {{ $t("pages.settings.languagePractice.levelUnset", "Not set") }}
            </option>
            <option
              v-for="option in levelOptions"
              :key="`level-${option.value}`"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
        </label>

        <label class="language-practice-settings__field">
          <span class="language-practice-settings__field-label">
            {{ $t("pages.languagePractice.corrections") }}
          </span>
          <select
            v-model="form.correction_preference"
            class="language-practice-settings__select"
            :disabled="loading || saving || !form.is_active"
          >
            <option
              v-for="option in correctionOptions"
              :key="`correction-${option.value}`"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
        </label>

        <label class="language-practice-settings__field">
          <span class="language-practice-settings__field-label">
            {{ $t("pages.languagePractice.mode") }}
          </span>
          <select
            v-model="form.language_exchange_mode"
            class="language-practice-settings__select"
            :disabled="loading || saving || !form.is_active"
          >
            <option
              v-for="option in exchangeModeOptions"
              :key="`mode-${option.value}`"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
        </label>
      </div>

      <p v-if="!form.is_active" class="language-practice-settings__hint">
        {{ $t("pages.settings.languagePractice.inactiveHint") }}
      </p>

      <div
        v-if="saveError"
        class="language-practice-settings__feedback language-practice-settings__feedback--error"
        role="alert"
      >
        {{ saveError }}
      </div>

      <div
        v-else-if="saveSuccess"
        class="language-practice-settings__feedback language-practice-settings__feedback--success"
        role="status"
      >
        {{ saveSuccess }}
      </div>

      <div class="language-practice-settings__actions">
        <button
          type="button"
          class="language-practice-settings__save-button"
          :disabled="loading || saving || !isDirty"
          @click="savePreferences"
        >
          <span
            v-if="saving"
            class="language-practice-settings__spinner"
            aria-hidden="true"
          />
          {{ $t("components.profile-container.save") }}
        </button>
      </div>
    </div>

    <div
      v-else
      class="language-practice-settings__feedback language-practice-settings__feedback--info"
    >
      {{ $t("components.settings-container.loading") }}
    </div>
  </section>
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
const initialSnapshot = ref(JSON.stringify(normalizePreference(getDefaultLanguagePracticePreference())));
const form = ref(normalizePreference(getDefaultLanguagePracticePreference()));

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

function normalizePreference(preference) {
  return {
    ...getDefaultLanguagePracticePreference(),
    ...preference,
    native_language_code: preference?.native_language_code ?? "",
    target_language_code: preference?.target_language_code ?? "",
    target_language_level: preference?.target_language_level ?? "",
  };
}

function toPayload(preference) {
  return {
    ...preference,
    native_language_code: preference.native_language_code || null,
    target_language_code: preference.target_language_code || null,
    target_language_level: preference.target_language_level || null,
  };
}

async function loadPreferences() {
  if (!authStore.user?.id) {
    loading.value = false;
    return;
  }

  loading.value = true;
  loadError.value = "";

  try {
    const preference = await fetchLanguagePracticePreference();
    form.value = normalizePreference(preference);
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
    const preference = await saveLanguagePracticePreference(toPayload(form.value));
    form.value = normalizePreference(preference);
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
.language-practice-settings {
  display: grid;
  gap: 1rem;
  color: rgb(var(--color-foreground));
}

.language-practice-settings__header {
  display: grid;
  gap: 0.5rem;
}

.language-practice-settings__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.language-practice-settings__subtitle,
.language-practice-settings__hint {
  margin: 0;
  font-size: 0.925rem;
  line-height: 1.5;
  color: rgb(var(--color-foreground) / 0.72);
}

.language-practice-settings__content {
  display: grid;
  gap: 1rem;
}

.language-practice-settings__toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.875rem;
  width: fit-content;
  cursor: pointer;
}

.language-practice-settings__toggle-input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.language-practice-settings__toggle-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 3rem;
  height: 1.7rem;
  padding: 0.2rem;
  border-radius: 999px;
  background: rgb(var(--color-border) / 0.8);
  transition: background-color 0.2s ease;
}

.language-practice-settings__toggle-thumb {
  width: 1.3rem;
  height: 1.3rem;
  border-radius: 999px;
  background: rgb(var(--color-surface));
  box-shadow: 0 3px 10px rgb(15 23 42 / 0.18);
  transition: transform 0.2s ease;
}

.language-practice-settings__toggle-input:checked + .language-practice-settings__toggle-track {
  background: rgb(var(--color-primary) / 0.85);
}

.language-practice-settings__toggle-input:checked
  + .language-practice-settings__toggle-track
  .language-practice-settings__toggle-thumb {
  transform: translateX(1.3rem);
}

.language-practice-settings__toggle-input:focus-visible + .language-practice-settings__toggle-track {
  outline: 2px solid rgb(var(--color-primary) / 0.55);
  outline-offset: 2px;
}

.language-practice-settings__toggle-input:disabled + .language-practice-settings__toggle-track {
  opacity: 0.6;
}

.language-practice-settings__toggle-label,
.language-practice-settings__field-label {
  font-size: 0.925rem;
  font-weight: 600;
  color: rgb(var(--color-foreground) / 0.86);
}

.language-settings-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.language-practice-settings__field {
  display: grid;
  gap: 0.45rem;
}

.language-practice-settings__select {
  width: 100%;
  min-height: 2.75rem;
  padding: 0.7rem 0.85rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 0.9rem;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font: inherit;
  color-scheme: light dark;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
}

.language-practice-settings__select:focus {
  outline: none;
  border-color: rgb(var(--color-primary) / 0.8);
  box-shadow: 0 0 0 3px rgb(var(--color-primary) / 0.16);
}

.language-practice-settings__select:disabled {
  cursor: not-allowed;
  background: rgb(var(--color-surface) / 0.7);
  color: rgb(var(--color-foreground) / 0.5);
}

.language-practice-settings__feedback {
  padding: 0.85rem 1rem;
  border-radius: 0.9rem;
  font-size: 0.925rem;
  line-height: 1.5;
}

.language-practice-settings__feedback--error {
  background: rgb(var(--color-danger) / 0.1);
  border: 1px solid rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}

.language-practice-settings__feedback--success {
  background: rgb(var(--color-success) / 0.12);
  border: 1px solid rgb(var(--color-success) / 0.22);
  color: rgb(var(--color-success));
}

.language-practice-settings__feedback--info {
  background: rgb(var(--color-info) / 0.12);
  border: 1px solid rgb(var(--color-info) / 0.22);
  color: rgb(var(--color-info));
}

.language-practice-settings__actions {
  display: flex;
  justify-content: flex-end;
}

.language-practice-settings__save-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  min-width: 8.5rem;
  min-height: 2.75rem;
  padding: 0.7rem 1.1rem;
  border: none;
  border-radius: 999px;
  background: linear-gradient(
    135deg,
    rgb(var(--color-primary)),
    rgb(var(--color-primary) / 0.82)
  );
  color: rgb(var(--color-background));
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.language-practice-settings__save-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 14px 24px -18px rgb(var(--color-primary) / 0.8);
}

.language-practice-settings__save-button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

.language-practice-settings__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid rgb(var(--color-background) / 0.35);
  border-top-color: rgb(var(--color-background));
  border-radius: 999px;
  animation: language-practice-settings-spin 0.7s linear infinite;
}

@keyframes language-practice-settings-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 959px) {
  .language-settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
