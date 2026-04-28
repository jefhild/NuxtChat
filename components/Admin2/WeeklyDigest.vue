<template>
  <section class="digest-admin-card">
    <div class="digest-admin-card__header">
      <div>
        <div class="digest-admin-kicker">Weekly Digest</div>
        <h2 class="digest-admin-title">Custom intro block</h2>
        <p class="digest-admin-subtitle">
          Add a localized note above the weekly activity summary. The main email template stays hardcoded.
        </p>
      </div>
      <div class="digest-admin-toolbar">
        <label class="digest-admin-field digest-admin-field--locale">
          <span class="digest-admin-field__label">Locale</span>
          <select v-model="activeLocale" class="digest-admin-field__control">
            <option v-for="locale in localeOptions" :key="locale" :value="locale">
              {{ locale.toUpperCase() }}
            </option>
          </select>
        </label>
      </div>
    </div>

    <div class="digest-admin-card__body">
      <div
        v-if="!storageReady"
        class="digest-admin-banner digest-admin-banner--warning"
        role="alert"
      >
        The <code>weekly_digest_content</code> table does not exist yet. Run
        <code>SQL/20260427_add_weekly_digest_content.sql</code> before saving.
      </div>

      <div class="digest-admin-banner digest-admin-banner--info" role="status">
        Markdown is supported in the body. Links like <code>[Read more](https://example.com)</code>
        are allowed. Leave every field blank to remove this locale override and fall back to English.
      </div>

      <LoadingContainer v-if="loading" text="Loading weekly digest content..." />

      <div v-else class="digest-admin-layout">
        <div class="digest-admin-main">
          <article class="digest-admin-panel digest-admin-editor">
            <div class="digest-admin-editor__header">
              <div>
                <div class="digest-admin-editor__label">Email block content</div>
                <div class="digest-admin-editor__key">weekly_digest_content.{{ activeLocale }}</div>
              </div>
              <span
                class="digest-admin-status-pill"
                :class="form.hasOverride ? 'digest-admin-status-pill--success' : 'digest-admin-status-pill--muted'"
              >
                {{ form.hasOverride ? "Override" : "Fallback" }}
              </span>
            </div>

            <label class="digest-admin-toggle">
              <input
                v-model="form.enabled"
                type="checkbox"
                class="digest-admin-toggle__input"
              >
              <span class="digest-admin-toggle__copy">
                <span class="digest-admin-toggle__label">Include this custom block in weekly emails</span>
                <span class="digest-admin-toggle__hint">Turn it off to keep the content saved but stop injecting it.</span>
              </span>
            </label>

            <label class="digest-admin-field">
              <span class="digest-admin-field__label">Block title</span>
              <input
                v-model="form.title"
                type="text"
                class="digest-admin-field__control"
                placeholder="Optional heading"
              >
            </label>

            <label class="digest-admin-field">
              <span class="digest-admin-field__label">Body</span>
              <textarea
                v-model="form.body"
                rows="8"
                class="digest-admin-field__control digest-admin-field__control--textarea"
                placeholder="Add your weekly note here. Markdown and https:// links are supported."
              ></textarea>
              <span class="digest-admin-field__hint">
                Keep this short. It appears above the activity summary in the email.
              </span>
            </label>

            <div class="digest-admin-grid">
              <label class="digest-admin-field">
                <span class="digest-admin-field__label">Optional CTA label</span>
                <input
                  v-model="form.ctaLabel"
                  type="text"
                  class="digest-admin-field__control"
                  placeholder="Read more"
                >
              </label>

              <label class="digest-admin-field">
                <span class="digest-admin-field__label">Optional CTA URL</span>
                <input
                  v-model="form.ctaUrl"
                  type="text"
                  class="digest-admin-field__control"
                  placeholder="https://..."
                >
                <span class="digest-admin-field__hint">Only https:// and mailto: links are allowed.</span>
              </label>
            </div>
          </article>
        </div>

        <aside class="digest-admin-sidebar">
          <section class="digest-admin-panel digest-admin-actions">
            <div class="digest-admin-preview__label">Actions</div>
            <p class="digest-admin-actions__copy">
              Save this locale, translate it to the others, or send yourself a preview email using the selected locale.
            </p>
            <p class="digest-admin-actions__copy">
              Status:
              <strong>{{ form.enabled ? "Enabled" : "Disabled" }}</strong>
            </p>
            <div class="digest-admin-actions__buttons">
              <button
                type="button"
                class="digest-admin-button digest-admin-button--primary"
                :disabled="saving"
                @click="saveContent"
              >
                <span v-if="saving" class="digest-admin-button__spinner" aria-hidden="true" />
                Save
              </button>
              <button
                type="button"
                class="digest-admin-button"
                :disabled="translationLoading"
                @click="openTranslationDialog"
              >
                <span v-if="translationLoading" class="digest-admin-button__spinner" aria-hidden="true" />
                Translate
              </button>
              <button
                type="button"
                class="digest-admin-button digest-admin-button--secondary"
                :disabled="testEmailLoading || !canSendTestEmail"
                @click="sendTestEmail"
              >
                <span v-if="testEmailLoading" class="digest-admin-button__spinner" aria-hidden="true" />
                Send test to me
              </button>
            </div>
            <p
              v-if="testEmailStatus"
              class="digest-admin-actions__status"
              :class="testEmailError ? 'digest-admin-actions__status--error' : 'digest-admin-actions__status--success'"
            >
              {{ testEmailStatus }}
            </p>
          </section>

          <section class="digest-admin-panel digest-admin-preview">
            <div class="digest-admin-preview__label">Preview</div>
            <p v-if="form.title" class="digest-admin-preview__title">
              {{ form.title }}
            </p>
            <div
              v-if="previewHtml"
              class="digest-admin-preview__body"
              v-html="previewHtml"
            />
            <p v-else class="digest-admin-preview__empty">
              No custom content yet for this locale.
            </p>
            <a
              v-if="form.ctaLabel && form.ctaUrl"
              :href="form.ctaUrl"
              class="digest-admin-preview__cta"
              target="_blank"
              rel="noopener noreferrer"
            >
              {{ form.ctaLabel }}
            </a>
          </section>
        </aside>
      </div>
    </div>
  </section>

  <Teleport to="body">
    <Transition name="digest-admin-dialog-fade">
      <div
        v-if="translationDialog"
        class="digest-admin-dialog-layer"
        role="presentation"
      >
        <button
          type="button"
          class="digest-admin-dialog-backdrop"
          aria-label="Close translation dialog"
          @click="translationDialog = false"
        />
        <div
          class="digest-admin-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="digest-admin-translate-title"
        >
          <div class="digest-admin-dialog__card">
            <div class="digest-admin-dialog__header">
              <h2 id="digest-admin-translate-title" class="digest-admin-dialog__title">
                Translate weekly digest block
              </h2>
            </div>
            <div class="digest-admin-dialog__body">
              <div class="digest-admin-checkbox-list">
                <label
                  v-for="option in translationOptions"
                  :key="option.value"
                  class="digest-admin-checkbox"
                >
                  <input
                    v-model="translationForm.locales"
                    type="checkbox"
                    :value="option.value"
                  >
                  <span>{{ option.label }}</span>
                </label>
              </div>

              <label class="digest-admin-checkbox digest-admin-checkbox--toggle">
                <input
                  v-model="translationForm.overwrite"
                  type="checkbox"
                >
                <span>Overwrite existing translations</span>
              </label>
            </div>
            <div class="digest-admin-dialog__actions">
              <button
                type="button"
                class="digest-admin-button"
                @click="translationDialog = false"
              >
                Cancel
              </button>
              <button
                type="button"
                class="digest-admin-button digest-admin-button--primary"
                :disabled="translationLoading"
                @click="translateContent"
              >
                <span v-if="translationLoading" class="digest-admin-button__spinner" aria-hidden="true" />
                Translate
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <Teleport to="body">
    <div class="digest-admin-toast-stack" aria-live="polite" aria-atomic="true">
      <Transition name="digest-admin-toast-fade">
        <div
          v-if="snackbar.show"
          class="digest-admin-toast"
          :class="snackbar.color === 'error' ? 'digest-admin-toast--error' : 'digest-admin-toast--success'"
          role="status"
        >
          {{ snackbar.message }}
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useAuthStore } from "@/stores/authStore1";

const authStore = useAuthStore();
const localeOptions = ["en", "fr", "ru", "zh"];
const activeLocale = ref("en");
const loading = ref(false);
const saving = ref(false);
const translationLoading = ref(false);
const translationDialog = ref(false);
const testEmailLoading = ref(false);
const testEmailStatus = ref("");
const testEmailError = ref(false);
const storageReady = ref(true);
const form = ref({
  enabled: true,
  title: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
  hasOverride: false,
});

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

const { init: initMarkdown, render: renderMarkdown } = useMarkdown();

const translationOptions = computed(() =>
  localeOptions
    .filter((locale) => locale !== activeLocale.value)
    .map((locale) => ({
      label: locale.toUpperCase(),
      value: locale,
    }))
);

const canSendTestEmail = computed(() => Boolean(authStore.user?.id));

const previewHtml = computed(() => {
  const rendered = renderMarkdown(form.value.body || "");
  return rendered === "<br>" ? "" : rendered;
});

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

const clearTestEmailStatus = () => {
  testEmailStatus.value = "";
  testEmailError.value = false;
};

const applyContent = (content?: Partial<typeof form.value> & { hasOverride?: boolean }) => {
  form.value = {
    enabled: content?.enabled !== false,
    title: String(content?.title || ""),
    body: String(content?.body || ""),
    ctaLabel: String(content?.ctaLabel || ""),
    ctaUrl: String(content?.ctaUrl || ""),
    hasOverride: Boolean(content?.hasOverride),
  };
};

const loadContent = async () => {
  loading.value = true;
  clearTestEmailStatus();
  try {
    const response = await $fetch("/api/admin/weekly-digest-content", {
      query: { locale: activeLocale.value },
    });
    storageReady.value = Boolean(response?.storageReady);
    applyContent(response?.content || {});
  } catch (error) {
    console.error("Failed to load weekly digest content:", error);
    storageReady.value = false;
    applyContent();
    showMessage("Failed to load weekly digest content.", "error");
  } finally {
    loading.value = false;
  }
};

const saveContent = async () => {
  saving.value = true;
  try {
    const response = await $fetch("/api/admin/weekly-digest-content/save", {
      method: "POST",
      body: {
        locale: activeLocale.value,
        enabled: form.value.enabled,
        title: form.value.title,
        body: form.value.body,
        ctaLabel: form.value.ctaLabel,
        ctaUrl: form.value.ctaUrl,
      },
    });
    storageReady.value = Boolean(response?.storageReady);
    applyContent(response?.content || {});
    showMessage("Weekly digest content saved.");
  } catch (error: any) {
    console.error("Failed to save weekly digest content:", error);
    showMessage(error?.data?.error || "Failed to save weekly digest content.", "error");
  } finally {
    saving.value = false;
  }
};

const sendTestEmail = async () => {
  if (!authStore.user?.id) return;

  testEmailLoading.value = true;
  clearTestEmailStatus();
  try {
    const response = await $fetch("/api/admin/notifications/test-email", {
      method: "POST",
      body: {
        userId: authStore.user.id,
        type: "weekly_digest",
        localeOverride: activeLocale.value,
      },
    });
    testEmailStatus.value = `Sent to ${response.sentTo}`;
  } catch (error: any) {
    testEmailError.value = true;
    testEmailStatus.value = error?.data?.error || "Failed to send test email.";
  } finally {
    testEmailLoading.value = false;
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
    const response = await $fetch("/api/admin/weekly-digest-content/translate", {
      method: "POST",
      body: {
        sourceLocale: activeLocale.value,
        targetLocales: translationForm.value.locales,
        overwrite: translationForm.value.overwrite,
        enabled: form.value.enabled,
        title: form.value.title,
        body: form.value.body,
        ctaLabel: form.value.ctaLabel,
        ctaUrl: form.value.ctaUrl,
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
    console.error("Failed to translate weekly digest content:", error);
    showMessage(error?.data?.error || "Failed to translate weekly digest content.", "error");
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

onMounted(async () => {
  await initMarkdown();
});

onBeforeUnmount(() => {
  if (snackbarTimer) {
    clearTimeout(snackbarTimer);
  }
});
</script>

<style scoped>
.digest-admin-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgba(var(--color-surface), 0.985);
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
  isolation: isolate;
}

.digest-admin-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.digest-admin-card__body {
  padding: 20px 22px 22px;
  background: rgba(var(--color-surface), 0.985);
}

.digest-admin-kicker {
  color: rgba(var(--color-text), 0.6);
  font-size: 0.74rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.digest-admin-title {
  margin: 6px 0 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.digest-admin-subtitle {
  margin: 8px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.digest-admin-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.digest-admin-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.digest-admin-field--locale {
  min-width: 120px;
}

.digest-admin-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.digest-admin-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.985);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  color-scheme: light dark;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
}

.digest-admin-field__control--textarea {
  min-height: 220px;
  resize: vertical;
  line-height: 1.55;
}

.digest-admin-field__hint {
  color: rgba(var(--color-text), 0.62);
  font-size: 0.8rem;
}

.digest-admin-toggle {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 16px;
  background: rgba(var(--color-surface), 0.985);
  padding: 12px 14px;
}

.digest-admin-toggle__input {
  margin-top: 2px;
}

.digest-admin-toggle__copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.digest-admin-toggle__label {
  color: rgb(var(--color-heading));
  font-size: 0.92rem;
  font-weight: 700;
}

.digest-admin-toggle__hint {
  color: rgba(var(--color-text), 0.64);
  font-size: 0.82rem;
}

.digest-admin-button {
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

.digest-admin-button--primary {
  border-color: rgba(var(--color-primary), 0.3);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.digest-admin-button--secondary {
  border-color: rgba(59, 130, 246, 0.26);
  background: rgba(59, 130, 246, 0.12);
  color: rgb(96, 165, 250);
}

.digest-admin-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.digest-admin-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: digest-admin-spin 0.8s linear infinite;
}

.digest-admin-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.digest-admin-banner--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  color: rgb(146, 64, 14);
}

.digest-admin-banner--info {
  border-color: rgba(var(--color-primary), 0.24);
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-text));
}

.digest-admin-layout {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  align-items: start;
}

.digest-admin-main,
.digest-admin-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.digest-admin-panel {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.985);
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.1);
  padding: 18px;
}

.digest-admin-editor {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.digest-admin-editor__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.digest-admin-editor__label,
.digest-admin-preview__label {
  color: rgb(var(--color-heading));
  font-size: 0.95rem;
  font-weight: 700;
}

.digest-admin-editor__key {
  color: rgba(var(--color-text), 0.62);
  font-size: 0.8rem;
  margin-top: 4px;
}

.digest-admin-status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 0.74rem;
  font-weight: 700;
}

.digest-admin-status-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.digest-admin-status-pill--muted {
  background: rgba(var(--color-border), 0.5);
  color: rgba(var(--color-text), 0.72);
}

.digest-admin-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

.digest-admin-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.digest-admin-actions__copy {
  margin: 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.9rem;
  line-height: 1.55;
}

.digest-admin-actions__buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.digest-admin-actions__status {
  margin: 0;
  border-radius: 14px;
  padding: 10px 12px;
  font-size: 0.88rem;
  font-weight: 600;
}

.digest-admin-actions__status--success {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(21, 128, 61);
}

.digest-admin-actions__status--error {
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.digest-admin-preview {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.digest-admin-preview__title {
  margin: 0 0 10px;
  color: rgb(var(--color-heading));
  font-size: 1rem;
  font-weight: 700;
}

.digest-admin-preview__body :deep(p) {
  margin: 0 0 12px;
  color: rgba(var(--color-text), 0.82);
  line-height: 1.65;
}

.digest-admin-preview__body :deep(ul),
.digest-admin-preview__body :deep(ol) {
  margin: 0 0 12px;
  padding-left: 18px;
  color: rgba(var(--color-text), 0.82);
  line-height: 1.65;
}

.digest-admin-preview__body :deep(a) {
  color: rgb(var(--color-primary));
  font-weight: 600;
  text-decoration: underline;
}

.digest-admin-preview__empty {
  margin: 0;
  min-height: 48px;
  color: rgba(var(--color-text), 0.66);
  font-size: 0.92rem;
}

.digest-admin-preview__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-top: 8px;
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
  font-size: 0.9rem;
  font-weight: 700;
  text-decoration: none;
}

.digest-admin-dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 1600;
}

.digest-admin-dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.5);
}

.digest-admin-dialog {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.digest-admin-dialog__card {
  width: min(460px, 100%);
  border-radius: 24px;
  border: 1px solid rgba(var(--color-border), 0.88);
  background: rgba(var(--color-surface-elevated), 0.98);
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.22);
  padding: 20px;
}

.digest-admin-dialog__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.digest-admin-dialog__body {
  margin-top: 16px;
}

.digest-admin-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.digest-admin-checkbox-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.digest-admin-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--color-text));
  font-size: 0.92rem;
}

.digest-admin-checkbox--toggle {
  margin-top: 14px;
}

.digest-admin-toast-stack {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 1700;
}

.digest-admin-toast {
  min-width: 220px;
  max-width: min(360px, calc(100vw - 36px));
  border-radius: 16px;
  padding: 12px 14px;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.2);
  color: #fff;
}

.digest-admin-toast--success {
  background: rgba(22, 163, 74, 0.95);
}

.digest-admin-toast--error {
  background: rgba(220, 38, 38, 0.95);
}

.digest-admin-dialog-fade-enter-active,
.digest-admin-dialog-fade-leave-active,
.digest-admin-toast-fade-enter-active,
.digest-admin-toast-fade-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.digest-admin-dialog-fade-enter-from,
.digest-admin-dialog-fade-leave-to,
.digest-admin-toast-fade-enter-from,
.digest-admin-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes digest-admin-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1040px) {
  .digest-admin-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .digest-admin-grid,
  .digest-admin-checkbox-list {
    grid-template-columns: 1fr;
  }
}
</style>
