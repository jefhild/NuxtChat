<template>
  <div class="admin-avatar-stack">
    <section class="admin-avatar-card">
      <div class="admin-avatar-card__header">
        <div>
          <h2 class="admin-avatar-card__title">Profile Avatar Library</h2>
          <p class="admin-avatar-card__subtitle">
            Upload shared avatar assets and keep the core collections current.
          </p>
        </div>
      </div>
      <div class="admin-avatar-card__body">
        <form class="admin-avatar-form" @submit.prevent="handleUpload">
          <label class="admin-avatar-field">
            <span class="admin-avatar-field__label">Collection</span>
            <select v-model="selectedGender" class="admin-avatar-field__control">
              <option
                v-for="option in genderOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.title }}
              </option>
            </select>
          </label>

          <label class="admin-avatar-field">
            <span class="admin-avatar-field__label">Upload avatar</span>
            <input
              :key="`avatar-file-${fileInputKey}`"
              type="file"
              accept="image/*"
              class="admin-avatar-field__control admin-avatar-field__control--file"
              @change="handleFileChange"
            >
          </label>

          <div class="admin-avatar-actions">
            <button
              type="submit"
              class="admin-avatar-button admin-avatar-button--primary"
              :disabled="uploading || !selectedFile"
            >
              <span v-if="uploading" class="admin-avatar-button__spinner" aria-hidden="true" />
              Upload
            </button>
            <button
              type="button"
              class="admin-avatar-button"
              :disabled="loading"
              @click="loadAvatars"
            >
              <span v-if="loading" class="admin-avatar-button__spinner" aria-hidden="true" />
              Refresh list
            </button>
          </div>

          <div
            v-if="errorMessage"
            class="admin-avatar-banner admin-avatar-banner--error"
            role="alert"
          >
            {{ errorMessage }}
          </div>
          <div
            v-else-if="successMessage"
            class="admin-avatar-banner admin-avatar-banner--success"
            role="status"
          >
            {{ successMessage }}
          </div>
        </form>
      </div>
    </section>

    <section class="admin-avatar-card">
      <div class="admin-avatar-card__header">
        <div>
          <h2 class="admin-avatar-card__title">Current Collections</h2>
        </div>
      </div>
      <div class="admin-avatar-card__body">
        <LoadingContainer v-if="loading" text="Loading avatars..." />
        <div v-else class="admin-avatar-group-list">
          <section v-for="group in avatarGroups" :key="group.key" class="admin-avatar-group">
            <header class="admin-avatar-group__header">
              <h3 class="admin-avatar-group__title">{{ group.label }}</h3>
              <span class="admin-avatar-group__count">{{ group.items.length }}</span>
            </header>
            <div class="avatar-grid">
              <div
                v-if="!group.items.length"
                class="admin-avatar-empty-state"
              >
                No images yet.
              </div>
              <div
                v-for="item in group.items"
                :key="`${group.key}:${item.name}`"
                class="avatar-item"
              >
                <img :src="item.url" :alt="item.name" class="avatar-item__image">
                <button
                  type="button"
                  class="avatar-delete"
                  aria-label="Delete avatar"
                  @click="openDeleteDialog(group.key, item.name)"
                >
                  <i class="mdi mdi-close" aria-hidden="true" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <section class="admin-avatar-card">
      <div class="admin-avatar-card__header">
        <div>
          <h2 class="admin-avatar-card__title">Avatar Decorations</h2>
          <p class="admin-avatar-card__subtitle">
            Manage the decoration library shown in the profile editor.
          </p>
        </div>
      </div>
      <div class="admin-avatar-card__body">
        <form class="admin-avatar-form" @submit.prevent="handleDecorationUpload">
          <label class="admin-avatar-field">
            <span class="admin-avatar-field__label">Display name</span>
            <input
              v-model="decorationDisplayName"
              type="text"
              maxlength="80"
              placeholder="e.g. Neon Halo"
              class="admin-avatar-field__control"
            >
          </label>

          <label class="admin-avatar-field">
            <span class="admin-avatar-field__label">Upload decoration</span>
            <input
              :key="`decoration-file-${decorationFileInputKey}`"
              type="file"
              accept="image/*"
              class="admin-avatar-field__control admin-avatar-field__control--file"
              @change="handleDecorationFileChange"
            >
          </label>

          <div class="admin-avatar-actions">
            <button
              type="submit"
              class="admin-avatar-button admin-avatar-button--primary"
              :disabled="decorationUploading || !selectedDecorationFile"
            >
              <span v-if="decorationUploading" class="admin-avatar-button__spinner" aria-hidden="true" />
              Upload decoration
            </button>
            <button
              type="button"
              class="admin-avatar-button"
              :disabled="decorationsLoading"
              @click="loadDecorations"
            >
              <span v-if="decorationsLoading" class="admin-avatar-button__spinner" aria-hidden="true" />
              Refresh decorations
            </button>
          </div>

          <div
            v-if="decorationErrorMessage"
            class="admin-avatar-banner admin-avatar-banner--error"
            role="alert"
          >
            {{ decorationErrorMessage }}
          </div>
          <div
            v-else-if="decorationSuccessMessage"
            class="admin-avatar-banner admin-avatar-banner--success"
            role="status"
          >
            {{ decorationSuccessMessage }}
          </div>
        </form>
      </div>
    </section>

    <section class="admin-avatar-card">
      <div class="admin-avatar-card__header">
        <div>
          <h2 class="admin-avatar-card__title">Current Decorations</h2>
        </div>
        <span class="admin-avatar-group__count">{{ decorations.length }}</span>
      </div>
      <div class="admin-avatar-card__body">
        <LoadingContainer v-if="decorationsLoading" text="Loading decorations..." />
        <div v-else class="avatar-grid">
          <div
            v-if="!decorations.length"
            class="admin-avatar-empty-state"
          >
            No decoration images yet.
          </div>
          <div
            v-for="item in decorations"
            :key="`dec:${item.name}`"
            class="avatar-item decoration-item"
          >
            <img :src="item.url" :alt="item.name" class="decoration-preview">
            <div class="decoration-name">
              {{ item.label || item.name }}
            </div>
            <button
              type="button"
              class="avatar-delete"
              aria-label="Delete decoration"
              @click="openDecorationDeleteDialog(item.name)"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <Teleport to="body">
      <Transition name="admin-avatar-modal-fade">
        <div
          v-if="deleteDialog"
          class="admin-avatar-modal-layer"
          role="presentation"
        >
          <button
            type="button"
            class="admin-avatar-modal-backdrop"
            aria-label="Close avatar delete dialog"
            @click="closeDeleteDialog"
          />
          <div
            class="admin-avatar-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-avatar-delete-title"
          >
            <div class="admin-avatar-modal__card">
              <div class="admin-avatar-modal__header">
                <h2 id="admin-avatar-delete-title" class="admin-avatar-modal__title">Delete avatar?</h2>
              </div>
              <div class="admin-avatar-modal__body">
                This will remove the image from the shared collection.
              </div>
              <div class="admin-avatar-modal__actions">
                <button
                  type="button"
                  class="admin-avatar-button"
                  :disabled="deleting"
                  @click="closeDeleteDialog"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="admin-avatar-button admin-avatar-button--danger"
                  :disabled="deleting"
                  @click="confirmDelete"
                >
                  <span v-if="deleting" class="admin-avatar-button__spinner" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="admin-avatar-modal-fade">
        <div
          v-if="decorationDeleteDialog"
          class="admin-avatar-modal-layer"
          role="presentation"
        >
          <button
            type="button"
            class="admin-avatar-modal-backdrop"
            aria-label="Close decoration delete dialog"
            @click="closeDecorationDeleteDialog"
          />
          <div
            class="admin-avatar-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-decoration-delete-title"
          >
            <div class="admin-avatar-modal__card">
              <div class="admin-avatar-modal__header">
                <h2 id="admin-decoration-delete-title" class="admin-avatar-modal__title">Delete decoration?</h2>
              </div>
              <div class="admin-avatar-modal__body">
                This will remove the image from the shared decoration library.
              </div>
              <div class="admin-avatar-modal__actions">
                <button
                  type="button"
                  class="admin-avatar-button"
                  :disabled="decorationDeleting"
                  @click="closeDecorationDeleteDialog"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  class="admin-avatar-button admin-avatar-button--danger"
                  :disabled="decorationDeleting"
                  @click="confirmDecorationDelete"
                >
                  <span v-if="decorationDeleting" class="admin-avatar-button__spinner" aria-hidden="true" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from "vue";
import LoadingContainer from "../LoadingContainer.vue";

const genderOptions = [
  { title: "Male", value: 1 },
  { title: "Female", value: 2 },
  { title: "Other", value: 3 },
];

const selectedGender = ref(1);
const selectedFile = ref(null);
const fileInputKey = ref(0);
const uploading = ref(false);
const loading = ref(true);
const errorMessage = ref("");
const successMessage = ref("");
const avatars = ref({ male: [], female: [], other: [] });
const deleteDialog = ref(false);
const deleteTarget = ref({ folder: "", name: "" });
const deleting = ref(false);
const selectedDecorationFile = ref(null);
const decorationFileInputKey = ref(0);
const decorationUploading = ref(false);
const decorationsLoading = ref(true);
const decorationErrorMessage = ref("");
const decorationSuccessMessage = ref("");
const decorations = ref([]);
const decorationDisplayName = ref("");
const decorationDeleteDialog = ref(false);
const decorationDeleteTarget = ref("");
const decorationDeleting = ref(false);

const avatarGroups = computed(() => [
  { key: "male", label: "Male", items: avatars.value.male || [] },
  { key: "female", label: "Female", items: avatars.value.female || [] },
  { key: "other", label: "Other", items: avatars.value.other || [] },
]);

const extractSingleFile = (event) => {
  const files = event?.target?.files;
  return files?.[0] || null;
};

const handleFileChange = (event) => {
  selectedFile.value = extractSingleFile(event);
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const loadAvatars = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await $fetch("/api/admin/profile-avatars/list");
    avatars.value = result?.items || { male: [], female: [], other: [] };
  } catch (err) {
    console.error("[admin] load avatars failed:", err);
    errorMessage.value = "Failed to load avatar library.";
  } finally {
    loading.value = false;
  }
};

const loadDecorations = async () => {
  decorationsLoading.value = true;
  decorationErrorMessage.value = "";
  try {
    const result = await $fetch("/api/admin/avatar-decorations/list");
    decorations.value = Array.isArray(result?.items) ? result.items : [];
  } catch (err) {
    console.error("[admin] load decorations failed:", err);
    decorationErrorMessage.value = "Failed to load decoration library.";
  } finally {
    decorationsLoading.value = false;
  }
};

const handleUpload = async () => {
  if (!selectedFile.value) {
    errorMessage.value = "Please choose an image to upload.";
    return;
  }
  uploading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const dataUrl = await readFileAsDataUrl(selectedFile.value);
    const result = await $fetch("/api/admin/profile-avatars/upload", {
      method: "POST",
      body: {
        genderId: selectedGender.value,
        dataUrl,
      },
    });
    if (result?.avatarUrl) {
      successMessage.value = "Avatar uploaded successfully.";
      selectedFile.value = null;
      fileInputKey.value += 1;
      await loadAvatars();
    } else {
      errorMessage.value = "Upload failed. Please try again.";
    }
  } catch (err) {
    console.error("[admin] upload avatar failed:", err);
    errorMessage.value = "Upload failed. Please try again.";
  } finally {
    uploading.value = false;
  }
};

const handleDecorationFileChange = (event) => {
  selectedDecorationFile.value = extractSingleFile(event);
};

const handleDecorationUpload = async () => {
  if (!selectedDecorationFile.value) {
    decorationErrorMessage.value = "Please choose an image to upload.";
    return;
  }
  decorationUploading.value = true;
  decorationErrorMessage.value = "";
  decorationSuccessMessage.value = "";
  try {
    const dataUrl = await readFileAsDataUrl(selectedDecorationFile.value);
    const result = await $fetch("/api/admin/avatar-decorations/upload", {
      method: "POST",
      body: {
        dataUrl,
        displayName: decorationDisplayName.value,
      },
    });
    if (result?.decorationUrl) {
      decorationSuccessMessage.value = "Decoration uploaded successfully.";
      selectedDecorationFile.value = null;
      decorationDisplayName.value = "";
      decorationFileInputKey.value += 1;
      await loadDecorations();
    } else {
      decorationErrorMessage.value = "Upload failed. Please try again.";
    }
  } catch (err) {
    console.error("[admin] upload decoration failed:", err);
    decorationErrorMessage.value = "Upload failed. Please try again.";
  } finally {
    decorationUploading.value = false;
  }
};

const openDeleteDialog = (folder, name) => {
  deleteTarget.value = { folder, name };
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  deleteTarget.value = { folder: "", name: "" };
};

const confirmDelete = async () => {
  if (!deleteTarget.value.folder || !deleteTarget.value.name) return;
  deleting.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  try {
    const result = await $fetch("/api/admin/profile-avatars/delete", {
      method: "POST",
      body: {
        folder: deleteTarget.value.folder,
        name: deleteTarget.value.name,
      },
    });
    if (result?.success) {
      successMessage.value = "Avatar deleted.";
      closeDeleteDialog();
      await loadAvatars();
    } else {
      errorMessage.value = "Delete failed. Please try again.";
    }
  } catch (err) {
    console.error("[admin] delete avatar failed:", err);
    errorMessage.value = "Delete failed. Please try again.";
  } finally {
    deleting.value = false;
  }
};

const openDecorationDeleteDialog = (name) => {
  decorationDeleteTarget.value = String(name || "").trim();
  decorationDeleteDialog.value = true;
};

const closeDecorationDeleteDialog = () => {
  decorationDeleteDialog.value = false;
  decorationDeleteTarget.value = "";
};

const confirmDecorationDelete = async () => {
  if (!decorationDeleteTarget.value) return;
  decorationDeleting.value = true;
  decorationErrorMessage.value = "";
  decorationSuccessMessage.value = "";
  try {
    const result = await $fetch("/api/admin/avatar-decorations/delete", {
      method: "POST",
      body: { name: decorationDeleteTarget.value },
    });
    if (result?.success) {
      decorationSuccessMessage.value = "Decoration deleted.";
      closeDecorationDeleteDialog();
      await loadDecorations();
    } else {
      decorationErrorMessage.value = "Delete failed. Please try again.";
    }
  } catch (err) {
    console.error("[admin] delete decoration failed:", err);
    decorationErrorMessage.value = "Delete failed. Please try again.";
  } finally {
    decorationDeleting.value = false;
  }
};

onMounted(async () => {
  await Promise.all([loadAvatars(), loadDecorations()]);
});
</script>

<style scoped>
.admin-avatar-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-avatar-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-avatar-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  padding: 22px 22px 0;
}

.admin-avatar-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-avatar-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-avatar-card__body {
  padding: 20px 22px 22px;
}

.admin-avatar-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.admin-avatar-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.admin-avatar-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-avatar-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  outline: none;
  color-scheme: light dark;
}

.admin-avatar-field__control:focus {
  border-color: rgba(var(--color-primary), 0.5);
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.12);
}

.admin-avatar-field__control--file {
  padding: 9px 12px;
}

.admin-avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.admin-avatar-button {
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

.admin-avatar-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.admin-avatar-button--primary {
  border-color: rgba(var(--color-primary), 0.35);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.admin-avatar-button--danger {
  border-color: rgba(239, 68, 68, 0.32);
  background: rgba(239, 68, 68, 0.11);
  color: rgb(185, 28, 28);
}

.admin-avatar-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: admin-avatar-spin 0.8s linear infinite;
}

.admin-avatar-banner {
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
}

.admin-avatar-banner--error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-avatar-banner--success {
  border-color: rgba(34, 197, 94, 0.32);
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.admin-avatar-group-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-avatar-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.admin-avatar-group__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-avatar-group__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1rem;
  font-weight: 700;
}

.admin-avatar-group__count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(var(--color-primary), 0.12);
  color: rgb(var(--color-primary));
  font-size: 0.8rem;
  font-weight: 700;
}

.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.admin-avatar-empty-state {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.85rem;
}

.avatar-item {
  position: relative;
  width: 56px;
  height: 56px;
  border: 1px solid rgba(var(--color-border), 0.86);
  border-radius: 999px;
  padding: 3px;
  background: rgba(var(--color-surface), 0.92);
}

.avatar-item__image {
  width: 100%;
  height: 100%;
  border-radius: inherit;
  object-fit: cover;
  display: block;
}

.avatar-delete {
  position: absolute;
  top: -6px;
  right: -6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  border: 1px solid rgba(239, 68, 68, 0.22);
  background: rgba(239, 68, 68, 0.95);
  color: white;
}

.decoration-item {
  width: 136px;
  min-height: 106px;
  border-radius: 14px;
  padding: 8px 8px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.decoration-preview {
  width: 64px;
  height: 64px;
  object-fit: contain;
  display: block;
}

.decoration-name {
  max-width: 118px;
  line-height: 1.2;
  text-align: center;
  overflow-wrap: anywhere;
  color: rgba(var(--color-text), 0.74);
  font-size: 0.8rem;
}

.admin-avatar-modal-layer {
  position: fixed;
  inset: 0;
  z-index: 2600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.admin-avatar-modal-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(15, 23, 42, 0.56);
}

.admin-avatar-modal {
  position: relative;
  width: min(100%, 420px);
}

.admin-avatar-modal__card {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background: rgb(var(--color-surface));
  box-shadow: 0 28px 70px rgba(15, 23, 42, 0.24);
}

.admin-avatar-modal__header,
.admin-avatar-modal__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
}

.admin-avatar-modal__header {
  border-bottom: 1px solid rgba(var(--color-border), 0.82);
}

.admin-avatar-modal__body {
  padding: 20px;
  color: rgb(var(--color-text));
  line-height: 1.55;
}

.admin-avatar-modal__actions {
  justify-content: flex-end;
  border-top: 1px solid rgba(var(--color-border), 0.82);
}

.admin-avatar-modal__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.05rem;
  font-weight: 700;
}

.admin-avatar-modal-fade-enter-active,
.admin-avatar-modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.admin-avatar-modal-fade-enter-from,
.admin-avatar-modal-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .admin-avatar-actions,
  .admin-avatar-modal__actions {
    align-items: stretch;
  }

  .admin-avatar-button {
    width: 100%;
  }
}

@keyframes admin-avatar-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
