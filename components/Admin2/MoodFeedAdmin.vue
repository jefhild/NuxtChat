<template>
  <div class="admin-mood-feed">
    <section class="admin-mood-card">
      <div class="admin-mood-card__header">
        <div class="admin-mood-card__heading">
          <i class="mdi mdi-tune-variant admin-mood-card__icon" aria-hidden="true" />
          <div>
            <h2 class="admin-mood-card__title">Mood Feed Defaults</h2>
            <p class="admin-mood-card__subtitle">
              Control the rewrite tone and the refine prompt used before entries are stored.
            </p>
          </div>
        </div>
      </div>

      <div class="admin-mood-card__body">
        <div class="admin-mood-settings-row">
          <label class="admin-mood-field tone-select">
            <span class="admin-mood-field__label">Default tone</span>
            <select v-model="defaultTone" class="admin-mood-field__control">
              <option v-for="tone in toneOptions" :key="tone" :value="tone">
                {{ tone }}
              </option>
            </select>
          </label>
          <button
            type="button"
            class="admin-mood-button admin-mood-button--primary"
            :disabled="settingsSaving"
            @click="saveSettings"
          >
            Save
          </button>
        </div>

        <label class="admin-mood-field">
          <span class="admin-mood-field__label">Refine prompt</span>
          <textarea
            v-model="refinePromptTemplate"
            rows="8"
            class="admin-mood-field__control admin-mood-field__control--textarea"
          ></textarea>
        </label>

        <div class="admin-mood-help">
          Used by the AI rewrite step after a user answers a mood prompt. You can use
          <code>&#123;&#123;locale&#125;&#125;</code> and <code>&#123;&#123;tone&#125;&#125;</code> tokens.
        </div>
      </div>
    </section>

    <section class="admin-mood-card">
      <div class="admin-mood-card__header">
        <div class="admin-mood-card__heading">
          <i class="mdi mdi-comment-question-outline admin-mood-card__icon" aria-hidden="true" />
          <div>
            <h2 class="admin-mood-card__title">Mood Feed Prompts</h2>
            <p class="admin-mood-card__subtitle">
              Create and edit prompt copy for the current locale.
            </p>
          </div>
        </div>
        <div class="admin-mood-toolbar">
          <button type="button" class="admin-mood-button" @click="loadPrompts">
            Refresh
          </button>
          <button
            type="button"
            class="admin-mood-button admin-mood-button--primary"
            @click="openCreate"
          >
            New Prompt
          </button>
        </div>
      </div>

      <div class="admin-mood-card__body">
        <LoadingContainer v-if="isLoading" />

        <div
          v-else-if="prompts.length === 0"
          class="admin-mood-banner admin-mood-banner--info"
        >
          No prompts yet.
        </div>

        <div v-else class="admin-mood-table-wrap">
          <table class="admin-mood-table">
            <thead>
              <tr>
                <th>Key</th>
                <th>Prompt ({{ locale.toUpperCase() }})</th>
                <th>Active</th>
                <th>Updated</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="prompt in prompts" :key="prompt.id">
                <td>{{ prompt.prompt_key }}</td>
                <td class="prompt-text">
                  {{ prompt.prompt_text || "—" }}
                </td>
                <td>
                  <label class="admin-mood-switch">
                    <input
                      :checked="prompt.is_active"
                      type="checkbox"
                      class="admin-mood-switch__input"
                      @change="toggleActive(prompt, $event.target.checked)"
                    >
                    <span class="admin-mood-switch__track">
                      <span class="admin-mood-switch__thumb" />
                    </span>
                  </label>
                </td>
                <td>{{ formatDate(prompt.updated_at) }}</td>
                <td>
                  <div class="actions-col">
                    <button
                      type="button"
                      class="admin-mood-button"
                      @click="openEdit(prompt)"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      class="admin-mood-button admin-mood-button--danger"
                      @click="deletePrompt(prompt)"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="admin-mood-card">
      <div class="admin-mood-card__header">
        <div class="admin-mood-card__heading">
          <i class="mdi mdi-shield-check-outline admin-mood-card__icon" aria-hidden="true" />
          <div>
            <h2 class="admin-mood-card__title">Pending Moderation</h2>
            <p class="admin-mood-card__subtitle">
              Approve or reject queued entries and replies before they are published.
            </p>
          </div>
        </div>
        <button type="button" class="admin-mood-button" @click="loadModeration">
          Refresh
        </button>
      </div>

      <div class="admin-mood-card__body">
        <LoadingContainer v-if="moderationLoading" />

        <div
          v-else-if="pendingEntries.length === 0 && pendingReplies.length === 0"
          class="admin-mood-banner admin-mood-banner--info"
        >
          No items awaiting moderation.
        </div>

        <div v-else class="admin-mood-moderation-stack">
          <section v-if="pendingEntries.length">
            <h3 class="admin-mood-section-title">Entries</h3>
            <div class="admin-mood-table-wrap">
              <table class="admin-mood-table">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Response</th>
                    <th>Author</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in pendingEntries" :key="entry.id">
                    <td class="prompt-text">
                      {{ entry.prompt_text || entry.prompt_key || "—" }}
                    </td>
                    <td class="prompt-text">
                      {{ entry.refined_text || entry.original_text || "—" }}
                    </td>
                    <td>{{ entry.profiles?.displayname || entry.user_id }}</td>
                    <td>{{ formatDate(entry.created_at) }}</td>
                    <td>
                      <div class="actions-col">
                        <button
                          type="button"
                          class="admin-mood-button admin-mood-button--primary"
                          @click="updateEntryStatus(entry, 'published')"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          class="admin-mood-button admin-mood-button--danger"
                          @click="updateEntryStatus(entry, 'rejected')"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section v-if="pendingReplies.length">
            <h3 class="admin-mood-section-title">Replies</h3>
            <div class="admin-mood-table-wrap">
              <table class="admin-mood-table">
                <thead>
                  <tr>
                    <th>Prompt</th>
                    <th>Reply</th>
                    <th>Author</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="reply in pendingReplies" :key="reply.id">
                    <td class="prompt-text">
                      {{
                        reply.mood_feed_entries?.prompt_text ||
                        reply.mood_feed_entries?.prompt_key ||
                        "—"
                      }}
                    </td>
                    <td class="prompt-text">{{ reply.content || "—" }}</td>
                    <td>{{ reply.profiles?.displayname || reply.user_id }}</td>
                    <td>{{ formatDate(reply.created_at) }}</td>
                    <td>
                      <div class="actions-col">
                        <button
                          type="button"
                          class="admin-mood-button admin-mood-button--primary"
                          @click="updateReplyStatus(reply, 'published')"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          class="admin-mood-button admin-mood-button--danger"
                          @click="updateReplyStatus(reply, 'rejected')"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </section>

    <MoodFeedFlags />
  </div>

  <Teleport to="body">
    <Transition name="admin-mood-modal-fade">
      <div
        v-if="dialog.open"
        class="admin-mood-modal-layer"
        role="presentation"
      >
        <button
          type="button"
          class="admin-mood-modal-backdrop"
          aria-label="Close mood prompt dialog"
          @click="closeDialog"
        />
        <div
          class="admin-mood-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-mood-dialog-title"
        >
          <div class="admin-mood-modal__card">
            <div class="admin-mood-modal__header">
              <h2 id="admin-mood-dialog-title" class="admin-mood-modal__title">
                {{ dialog.mode === "create" ? "New Prompt" : "Edit Prompt" }}
              </h2>
              <button
                type="button"
                class="admin-mood-icon-button"
                aria-label="Close mood prompt dialog"
                @click="closeDialog"
              >
                <i class="mdi mdi-close" aria-hidden="true" />
              </button>
            </div>
            <div class="admin-mood-modal__body">
              <div
                v-if="promptSaveError"
                class="admin-mood-banner admin-mood-banner--error"
              >
                {{ promptSaveError }}
              </div>
              <label class="admin-mood-field">
                <span class="admin-mood-field__label">Prompt Key</span>
                <input
                  v-model="dialog.form.prompt_key"
                  :disabled="dialog.mode === 'edit'"
                  type="text"
                  placeholder="morning_scream"
                  class="admin-mood-field__control"
                >
              </label>
              <label class="admin-mood-field">
                <span class="admin-mood-field__label">Prompt Text</span>
                <textarea
                  v-model="dialog.form.prompt_text"
                  rows="3"
                  class="admin-mood-field__control admin-mood-field__control--textarea"
                ></textarea>
              </label>
              <label class="admin-mood-switch admin-mood-switch--labeled">
                <input
                  v-model="dialog.form.is_active"
                  type="checkbox"
                  class="admin-mood-switch__input"
                >
                <span class="admin-mood-switch__track">
                  <span class="admin-mood-switch__thumb" />
                </span>
                <span class="admin-mood-switch__label">Active</span>
              </label>
            </div>
            <div class="admin-mood-modal__actions">
              <button
                type="button"
                class="admin-mood-button"
                @click="closeDialog"
              >
                Cancel
              </button>
              <button
                type="button"
                class="admin-mood-button admin-mood-button--primary"
                :disabled="saving"
                @click="saveDialog"
              >
                {{ dialog.mode === "create" ? "Create" : "Save" }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import MoodFeedFlags from "~/components/Admin2/MoodFeedFlags.vue";

const { locale } = useI18n();

const prompts = ref([]);
const defaultTone = ref("funny");
const refinePromptTemplate = ref("");
const isLoading = ref(true);
const saving = ref(false);
const settingsSaving = ref(false);
const moderationLoading = ref(true);
const pendingEntries = ref([]);
const pendingReplies = ref([]);
const promptSaveError = ref("");

const dialog = reactive({
  open: false,
  mode: "create",
  form: {
    id: null,
    prompt_key: "",
    prompt_text: "",
    is_active: true,
  },
});

const toneOptions = [
  "funny",
  "deadpan",
  "snarky",
  "playful",
  "sarcastic",
  "wholesome",
  "empathetic",
  "serious",
  "reflective",
  "poetic",
  "minimalist",
  "dramatic",
  "optimistic",
  "skeptical",
  "chaotic",
  "dry",
  "quirky",
  "blunt",
  "tender",
  "noir",
];

const loadSettings = async () => {
  try {
    const res = await $fetch("/api/admin/mood-feed/settings");
    defaultTone.value = res?.item?.default_tone || "funny";
    refinePromptTemplate.value = res?.item?.refine_prompt_template || "";
  } catch (error) {
    console.error("[admin][mood-feed] settings load error", error);
  }
};

const loadPrompts = async () => {
  isLoading.value = true;
  try {
    const res = await $fetch("/api/admin/mood-feed/prompts", {
      query: { locale: locale.value },
    });
    prompts.value = res?.items || [];
  } catch (error) {
    console.error("[admin][mood-feed] prompts load error", error);
    prompts.value = [];
  } finally {
    isLoading.value = false;
  }
};

onMounted(loadPrompts);
onMounted(loadSettings);

const formatDate = (dateString) => {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString();
};

const openCreate = () => {
  dialog.mode = "create";
  dialog.form = {
    id: null,
    prompt_key: "",
    prompt_text: "",
    is_active: true,
  };
  dialog.open = true;
};

const openEdit = (prompt) => {
  dialog.mode = "edit";
  dialog.form = {
    id: prompt.id,
    prompt_key: prompt.prompt_key,
    prompt_text: prompt.prompt_text || "",
    is_active: !!prompt.is_active,
  };
  dialog.open = true;
};

const closeDialog = () => {
  dialog.open = false;
};

const saveDialog = async () => {
  if (!dialog.form.prompt_key.trim()) return;
  saving.value = true;
  promptSaveError.value = "";
  try {
    if (dialog.mode === "create") {
      await $fetch("/api/admin/mood-feed/prompts", {
        method: "POST",
        body: {
          prompt_key: dialog.form.prompt_key.trim(),
          prompt_text: dialog.form.prompt_text.trim(),
          is_active: dialog.form.is_active,
          locale: locale.value,
          translate_all: true,
        },
      });
    } else {
      await $fetch(`/api/admin/mood-feed/prompts/${dialog.form.id}`, {
        method: "PATCH",
        body: {
          prompt_key: dialog.form.prompt_key.trim(),
          prompt_text: dialog.form.prompt_text.trim(),
          is_active: dialog.form.is_active,
          locale: locale.value,
          translate_all: true,
        },
      });
    }
    await loadPrompts();
    dialog.open = false;
  } catch (error) {
    console.error("[admin][mood-feed] prompt save error", error);
    const msg =
      error?.data?.error?.message ||
      error?.response?._data?.error?.message ||
      error?.statusMessage ||
      "Failed to save prompt.";
    promptSaveError.value = msg;
  } finally {
    saving.value = false;
  }
};

const loadModeration = async () => {
  moderationLoading.value = true;
  try {
    const res = await $fetch("/api/admin/mood-feed/moderation");
    pendingEntries.value = res?.entries || [];
    pendingReplies.value = res?.replies || [];
  } catch (error) {
    console.error("[admin][mood-feed] moderation load error", error);
    pendingEntries.value = [];
    pendingReplies.value = [];
  } finally {
    moderationLoading.value = false;
  }
};

onMounted(loadModeration);

const updateEntryStatus = async (entry, status) => {
  if (!entry?.id) return;
  try {
    await $fetch(`/api/admin/mood-feed/entries/${entry.id}`, {
      method: "PATCH",
      body: { status },
    });
    pendingEntries.value = pendingEntries.value.filter((e) => e.id !== entry.id);
  } catch (error) {
    console.error("[admin][mood-feed] entry status update error", error);
  }
};

const updateReplyStatus = async (reply, status) => {
  if (!reply?.id) return;
  try {
    await $fetch(`/api/admin/mood-feed/replies/${reply.id}`, {
      method: "PATCH",
      body: { status },
    });
    pendingReplies.value = pendingReplies.value.filter((r) => r.id !== reply.id);
  } catch (error) {
    console.error("[admin][mood-feed] reply status update error", error);
  }
};

const toggleActive = async (prompt, value) => {
  try {
    await $fetch(`/api/admin/mood-feed/prompts/${prompt.id}`, {
      method: "PATCH",
      body: {
        prompt_key: prompt.prompt_key,
        prompt_text: prompt.prompt_text || "",
        is_active: !!value,
        locale: locale.value,
        translate_all: false,
      },
    });
    prompt.is_active = !!value;
  } catch (error) {
    console.error("[admin][mood-feed] toggle active error", error);
  }
};

const deletePrompt = async (prompt) => {
  if (!prompt?.id) return;
  try {
    await $fetch(`/api/admin/mood-feed/prompts/${prompt.id}`, {
      method: "DELETE",
    });
    prompts.value = prompts.value.filter((item) => item.id !== prompt.id);
  } catch (error) {
    console.error("[admin][mood-feed] delete prompt error", error);
  }
};

const saveSettings = async () => {
  settingsSaving.value = true;
  try {
    const res = await $fetch("/api/admin/mood-feed/settings", {
      method: "PATCH",
      body: {
        default_tone: defaultTone.value,
        refine_prompt_template: refinePromptTemplate.value,
      },
    });
    defaultTone.value = res?.item?.default_tone || defaultTone.value;
    refinePromptTemplate.value =
      res?.item?.refine_prompt_template || refinePromptTemplate.value;
  } catch (error) {
    console.error("[admin][mood-feed] settings save error", error);
  } finally {
    settingsSaving.value = false;
  }
};
</script>

<style scoped>
.admin-mood-feed {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.admin-mood-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-mood-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.admin-mood-card__heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.admin-mood-card__icon {
  color: rgb(var(--color-primary));
  font-size: 1.35rem;
  margin-top: 2px;
}

.admin-mood-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-mood-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-mood-card__body {
  padding: 20px 22px 22px;
}

.admin-mood-settings-row,
.admin-mood-toolbar,
.actions-col {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-mood-settings-row {
  align-items: flex-end;
}

.admin-mood-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.admin-mood-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-mood-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  color-scheme: light dark;
}

.admin-mood-field__control--textarea {
  min-height: 150px;
  resize: vertical;
}

.tone-select {
  width: min(100%, 240px);
}

.admin-mood-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.92);
  color: rgb(var(--color-text));
  padding: 0 14px;
  font-size: 0.84rem;
  font-weight: 600;
}

.admin-mood-button--primary {
  border-color: rgba(var(--color-primary), 0.3);
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
}

.admin-mood-button--danger {
  border-color: rgba(239, 68, 68, 0.28);
  background: rgba(239, 68, 68, 0.1);
  color: rgb(185, 28, 28);
}

.admin-mood-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.admin-mood-help {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.84rem;
  line-height: 1.5;
  margin-top: 10px;
}

.admin-mood-help code {
  background: rgba(var(--color-primary), 0.1);
  border-radius: 8px;
  padding: 2px 6px;
}

.admin-mood-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
  margin-bottom: 16px;
}

.admin-mood-banner--info {
  background: rgba(var(--color-primary), 0.1);
  border-color: rgba(var(--color-primary), 0.24);
  color: rgb(var(--color-text));
}

.admin-mood-banner--error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-mood-table-wrap {
  overflow-x: auto;
}

.admin-mood-table {
  width: 100%;
  border-collapse: collapse;
}

.admin-mood-table th,
.admin-mood-table td {
  padding: 12px 10px;
  border-bottom: 1px solid rgba(var(--color-border), 0.72);
  text-align: left;
  vertical-align: top;
}

.admin-mood-table th {
  color: rgb(var(--color-heading));
  font-weight: 700;
}

.prompt-text {
  max-width: 420px;
  white-space: pre-wrap;
}

.admin-mood-switch {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.admin-mood-switch--labeled {
  margin-top: 4px;
}

.admin-mood-switch__input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.admin-mood-switch__track {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: rgba(var(--color-border), 0.9);
  transition: background-color 0.2s ease;
}

.admin-mood-switch__thumb {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: white;
  box-shadow: 0 2px 6px rgba(15, 23, 42, 0.16);
  transition: transform 0.2s ease;
}

.admin-mood-switch__input:checked + .admin-mood-switch__track {
  background: rgb(var(--color-primary));
}

.admin-mood-switch__input:checked + .admin-mood-switch__track .admin-mood-switch__thumb {
  transform: translateX(20px);
}

.admin-mood-switch__label {
  color: rgb(var(--color-text));
  font-size: 0.9rem;
}

.admin-mood-moderation-stack {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.admin-mood-section-title {
  margin: 0 0 10px;
  color: rgb(var(--color-heading));
  font-size: 0.96rem;
  font-weight: 700;
}

.admin-mood-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.admin-mood-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.56);
}

.admin-mood-modal {
  position: relative;
  width: min(100%, 560px);
}

.admin-mood-modal__card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgb(var(--color-surface));
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
}

.admin-mood-modal__header,
.admin-mood-modal__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.admin-mood-modal__header {
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
}

.admin-mood-modal__body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
}

.admin-mood-modal__actions {
  justify-content: flex-end;
  border-top: 1px solid rgba(var(--color-border), 0.82);
}

.admin-mood-modal__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.admin-mood-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-border), 0.86);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
}

.admin-mood-modal-fade-enter-active,
.admin-mood-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.admin-mood-modal-fade-enter-from,
.admin-mood-modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .admin-mood-card__header,
  .admin-mood-settings-row,
  .admin-mood-toolbar,
  .actions-col,
  .admin-mood-modal__actions {
    align-items: stretch;
  }

  .tone-select,
  .admin-mood-button {
    width: 100%;
  }
}
</style>
