<template>
  <section class="about-admin-card">
    <div class="about-admin-card__header">
      <div>
        <div class="about-admin-kicker">About Page</div>
        <h2 class="about-admin-title">Static sections, editable copy</h2>
        <p class="about-admin-subtitle">
          The layout stays hardcoded. Titles and body content are editable per locale.
        </p>
      </div>
      <div class="about-admin-toolbar">
        <label class="about-admin-field about-admin-field--locale">
          <span class="about-admin-field__label">Locale</span>
          <select v-model="activeLocale" class="about-admin-field__control">
            <option v-for="locale in localeOptions" :key="locale" :value="locale">
              {{ locale.toUpperCase() }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="about-admin-button"
          :disabled="translationLoading"
          @click="openTranslationDialog"
        >
          <span v-if="translationLoading" class="about-admin-button__spinner" aria-hidden="true" />
          Translate
        </button>
        <button
          type="button"
          class="about-admin-button about-admin-button--primary"
          :disabled="saving"
          @click="saveContent"
        >
          <span v-if="saving" class="about-admin-button__spinner" aria-hidden="true" />
          Save
        </button>
      </div>
    </div>

    <div class="about-admin-card__body">
      <div
        v-if="!storageReady"
        class="about-admin-banner about-admin-banner--warning"
        role="alert"
      >
        The <code>about_page_translations</code> table does not exist yet. Run
        <code>sql/about_page_translations.sql</code> before saving.
      </div>

      <div class="about-admin-banner about-admin-banner--info" role="status">
        Leaving a section blank removes its override for this locale and the page falls back to the built-in copy.
      </div>

      <LoadingContainer v-if="loading" text="Loading About content..." />

      <div v-else class="about-admin-section-list">
        <article
          v-for="section in formSections"
          :key="section.key"
          class="about-admin-section-card"
        >
          <div class="about-admin-section-card__header">
            <div>
              <div class="about-admin-section-card__label">{{ section.label }}</div>
              <div class="about-admin-section-card__key">{{ section.key }}</div>
            </div>
            <span
              class="about-admin-status-pill"
              :class="section.hasOverride ? 'about-admin-status-pill--success' : 'about-admin-status-pill--muted'"
            >
              {{ section.hasOverride ? "Override" : "Fallback" }}
            </span>
          </div>

          <label class="about-admin-field">
            <span class="about-admin-field__label">Section title</span>
            <input
              v-model="section.title"
              type="text"
              class="about-admin-field__control"
            >
          </label>

          <label class="about-admin-field">
            <span class="about-admin-field__label">Section body</span>
            <textarea
              v-model="section.body"
              rows="6"
              class="about-admin-field__control about-admin-field__control--textarea"
            ></textarea>
            <span class="about-admin-field__hint">Markdown is supported.</span>
          </label>
        </article>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <Transition name="about-admin-dialog-fade">
      <div
        v-if="translationDialog"
        class="about-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="about-admin-dialog-backdrop"
          aria-label="Close translation dialog"
          @click="translationDialog = false"
        />
        <div
          class="about-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-admin-translate-title"
        >
          <div class="about-admin-dialog__card">
            <div class="about-admin-dialog__header">
              <h2 id="about-admin-translate-title" class="about-admin-dialog__title">
                Translate About content
              </h2>
            </div>
            <div class="about-admin-dialog__body">
              <div class="about-admin-checkbox-list">
                <label
                  v-for="option in translationOptions"
                  :key="option.value"
                  class="about-admin-checkbox"
                >
                  <input
                    v-model="translationForm.locales"
                    type="checkbox"
                    :value="option.value"
                  >
                  <span>{{ option.label }}</span>
                </label>
              </div>

              <label class="about-admin-checkbox about-admin-checkbox--toggle">
                <input
                  v-model="translationForm.overwrite"
                  type="checkbox"
                >
                <span>Overwrite existing translations</span>
              </label>
            </div>
            <div class="about-admin-dialog__actions">
              <button
                type="button"
                class="about-admin-button"
                @click="translationDialog = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="about-admin-button about-admin-button--primary"
                :disabled="translationLoading"
                @click="translateContent"
              >
                <span v-if="translationLoading" class="about-admin-button__spinner" aria-hidden="true" />
                Translate
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <div class="about-admin-toast-stack" aria-live="polite" aria-atomic="true">
      <Transition name="about-admin-toast-fade">
        <div
          v-if="snackbar.show"
          class="about-admin-toast"
          :class="snackbar.color === 'error' ? 'about-admin-toast--error' : 'about-admin-toast--success'"
          role="status"
        >
          {{ snackbar.message }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ABOUT_SECTION_DEFINITIONS } from "@/utils/aboutPageSections";

const localeOptions = ["en", "fr", "ru", "zh"];
const activeLocale = ref("en");
const loading = ref(false);
const saving = ref(false);
const translationLoading = ref(false);
const translationDialog = ref(false);
const storageReady = ref(true);
const formSections = ref(
  ABOUT_SECTION_DEFINITIONS.map((section) => ({
    key: section.key,
    label: section.label,
    title: "",
    body: "",
    hasOverride: false,
  }))
);

const snackbar = ref({
  show: false,
  color: "success",
  message: "",
});

const translationForm = ref({
  locales: [] as string[],
  overwrite: false,
});

let snackbarTimer: ReturnType<typeof setTimeout> | null = null;

const translationOptions = computed(() =>
  localeOptions
    .filter((locale) => locale !== activeLocale.value)
    .map((locale) => ({
      label: locale.toUpperCase(),
      value: locale,
    }))
);

const showMessage = (message: string, color = "success") => {
  snackbar.value = {
    show: true,
    color,
    message,
  };

  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
  }

  snackbarTimer = setTimeout(() => {
    snackbar.value.show = false;
    snackbarTimer = null;
  }, 3200);
};

const applySections = (
  sections: Array<{ key: string; title?: string; body?: string; hasOverride?: boolean }> = []
) => {
  const sectionMap = new Map(sections.map((section) => [section.key, section]));
  formSections.value = ABOUT_SECTION_DEFINITIONS.map((definition) => {
    const current = sectionMap.get(definition.key);
    return {
      key: definition.key,
      label: definition.label,
      title: String(current?.title || ""),
      body: String(current?.body || ""),
      hasOverride: Boolean(current?.hasOverride),
    };
  });
};

const loadContent = async () => {
  loading.value = true;
  try {
    const response = await $fetch("/api/admin/about-content", {
      query: { locale: activeLocale.value },
    });
    storageReady.value = Boolean(response?.storageReady);
    applySections(response?.sections || []);
  } catch (error) {
    console.error("Failed to load About content:", error);
    storageReady.value = false;
    applySections([]);
    showMessage("Failed to load About content.", "error");
  } finally {
    loading.value = false;
  }
};

const saveContent = async () => {
  saving.value = true;
  try {
    const response = await $fetch("/api/admin/about-content/save", {
      method: "POST",
      body: {
        locale: activeLocale.value,
        sections: formSections.value.map((section) => ({
          key: section.key,
          title: section.title,
          body: section.body,
        })),
      },
    });
    storageReady.value = Boolean(response?.storageReady);
    applySections(response?.sections || []);
    showMessage("About content saved.");
  } catch (error: any) {
    console.error("Failed to save About content:", error);
    showMessage(error?.data?.error || "Failed to save About content.", "error");
  } finally {
    saving.value = false;
  }
};

const openTranslationDialog = () => {
  translationForm.value = {
    locales: translationOptions.value.map((option) => option.value),
    overwrite: false,
  };
  translationDialog.value = true;
};

const translateContent = async () => {
  if (!translationForm.value.locales.length) {
    showMessage("Choose at least one target locale.", "error");
    return;
  }

  translationLoading.value = true;
  try {
    const response = await $fetch("/api/admin/about-content/translate", {
      method: "POST",
      body: {
        sourceLocale: activeLocale.value,
        targetLocales: translationForm.value.locales,
        overwrite: translationForm.value.overwrite,
        sections: formSections.value.map((section) => ({
          key: section.key,
          title: section.title,
          body: section.body,
        })),
      },
    });

    translationDialog.value = false;
    showMessage(
      [
        response?.translated?.length
          ? `Translated: ${response.translated.join(", ")}`
          : "",
        response?.skipped?.length ? `Skipped: ${response.skipped.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ") || "Translation complete."
    );
  } catch (error: any) {
    console.error("Failed to translate About content:", error);
    showMessage(error?.data?.error || "Failed to translate About content.", "error");
  } finally {
    translationLoading.value = false;
  }
};

watch(
  () => activeLocale.value,
  () => {
    loadContent();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
  }
});
</script>

<style scoped>
.about-admin-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.about-admin-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.about-admin-card__body {
  padding: 20px 22px 22px;
}

.about-admin-kicker {
  color: rgba(var(--color-text), 0.6);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.about-admin-title {
  margin: 6px 0 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.about-admin-subtitle {
  margin: 8px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.about-admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.about-admin-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.about-admin-field--locale {
  min-width: 120px;
}

.about-admin-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.about-admin-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  color-scheme: light dark;
}

.about-admin-field__control--textarea {
  min-height: 150px;
  resize: vertical;
}

.about-admin-field__hint {
  color: rgba(var(--color-text), 0.62);
  font-size: 0.8rem;
}

.about-admin-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 42px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 0 16px;
  font-size: 0.92rem;
  font-weight: 600;
}

.about-admin-button--primary {
  border-color: rgba(var(--color-primary), 0.3);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.about-admin-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.about-admin-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: about-admin-spin 0.8s linear infinite;
}

.about-admin-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.about-admin-banner--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  color: rgb(146, 64, 14);
}

.about-admin-banner--info {
  border-color: rgba(var(--color-primary), 0.24);
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-text));
}

.about-admin-section-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.about-admin-section-card {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.88);
  padding: 16px;
}

.about-admin-section-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.about-admin-section-card__label {
  color: rgb(var(--color-heading));
  font-size: 0.95rem;
  font-weight: 700;
}

.about-admin-section-card__key {
  color: rgba(var(--color-text), 0.62);
  font-size: 0.8rem;
  margin-top: 4px;
}

.about-admin-status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.about-admin-status-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.about-admin-status-pill--muted {
  background: rgba(100, 116, 139, 0.12);
  color: rgb(71, 85, 105);
}

.about-admin-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.about-admin-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.56);
}

.about-admin-dialog {
  position: relative;
  width: min(100%, 520px);
}

.about-admin-dialog__card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgb(var(--color-surface));
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
}

.about-admin-dialog__header,
.about-admin-dialog__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.about-admin-dialog__header {
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
}

.about-admin-dialog__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.about-admin-dialog__actions {
  justify-content: flex-end;
  border-top: 1px solid rgba(var(--color-border), 0.82);
}

.about-admin-dialog__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.about-admin-checkbox-list {
  display: grid;
  gap: 10px;
}

.about-admin-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  color: rgb(var(--color-text));
}

.about-admin-checkbox--toggle {
  margin-top: 4px;
}

.about-admin-toast-stack {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 2700;
}

.about-admin-toast {
  min-width: 220px;
  max-width: 360px;
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.2);
  color: white;
  font-size: 0.9rem;
}

.about-admin-toast--success {
  background: rgb(22, 101, 52);
}

.about-admin-toast--error {
  background: rgb(185, 28, 28);
}

.about-admin-dialog-fade-enter-active,
.about-admin-dialog-fade-leave-active,
.about-admin-toast-fade-enter-active,
.about-admin-toast-fade-leave-active {
  transition: opacity 0.2s ease;
}

.about-admin-dialog-fade-enter-from,
.about-admin-dialog-fade-leave-to,
.about-admin-toast-fade-enter-from,
.about-admin-toast-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .about-admin-card__header,
  .about-admin-toolbar,
  .about-admin-dialog__actions {
    align-items: stretch;
  }

  .about-admin-field--locale,
  .about-admin-button {
    width: 100%;
  }
}

@keyframes about-admin-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
