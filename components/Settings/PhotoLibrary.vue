<template>
  <div>
    <section class="photo-library-card">
      <div class="photo-library-card__header">
        <h2 class="photo-library-card__title">
          {{ t("components.photo-library.title") }}
        </h2>
        <button
          type="button"
          class="ui-settings-btn ui-settings-btn--secondary photo-library-card__refresh"
          :disabled="loading"
          @click="loadPhotos"
        >
          <span v-if="loading" class="photo-library-card__spinner" aria-hidden="true" />
          {{ t("components.photo-library.refresh") }}
        </button>
      </div>

      <form class="photo-library-form" @submit.prevent="uploadPhoto">
        <label class="photo-library-upload">
          <span class="photo-library-upload__label">
            {{ t("components.photo-library.add") }}
          </span>
          <input
            :key="fileInputKey"
            accept="image/png,image/jpeg,image/webp"
            type="file"
            class="photo-library-upload__input"
            @change="handleFileChange($event.target.files)"
          >
        </label>
        <div class="photo-library-form__actions">
          <button
            type="submit"
            class="ui-settings-btn ui-settings-btn--primary photo-library-form__submit"
            :disabled="uploading || !selectedFile"
          >
            <span v-if="uploading" class="photo-library-card__spinner" aria-hidden="true" />
            {{ t("components.photo-library.upload") }}
          </button>
          <span class="photo-library-form__hint">
            {{ t("components.photo-library.requirements") }}
          </span>
        </div>
      </form>

      <div
        v-if="errorMessage"
        class="photo-library-status photo-library-status--error"
      >
        {{ errorMessage }}
      </div>
      <div
        v-else-if="successMessage"
        class="photo-library-status photo-library-status--success"
      >
        {{ successMessage }}
      </div>

      <LoadingContainer
        v-if="loading"
        :text="t('components.photo-library.loading')"
        class="mt-4"
      />
      <template v-else>
        <div v-if="photos.length" class="photo-library-grid">
          <article v-for="photo in photos" :key="photo.id" class="photo-card">
            <img
              :src="photo.url || photo.public_url"
              class="photo-card__image"
              alt=""
            >
            <div class="photo-card__footer">
              <span
                class="photo-card__status"
                :class="`photo-card__status--${statusColor(photo.status)}`"
              >
                {{ statusLabel(photo.status) }}
              </span>
              <button
                type="button"
                class="photo-card__delete"
                :disabled="deleting"
                @click="openDeleteDialog(photo)"
              >
                <i class="mdi mdi-delete" aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
        <p v-else class="photo-library-empty">
          {{ t("components.photo-library.empty") }}
        </p>
      </template>
    </section>

    <Teleport to="body">
      <Transition name="photo-library-modal-fade">
        <div
          v-if="deleteDialog"
          class="photo-library-modal"
          role="presentation"
        >
          <button
            type="button"
            class="photo-library-modal__scrim"
            aria-label="Close photo delete dialog"
            @click="closeDeleteDialog"
          />
          <div class="photo-library-modal__panel">
            <h3 class="photo-library-modal__title">
              {{ t("components.photo-library.delete-title") }}
            </h3>
            <p class="photo-library-modal__body">
              {{ t("components.photo-library.delete-body") }}
            </p>
            <div class="photo-library-modal__actions">
              <button
                type="button"
                class="ui-settings-btn ui-settings-btn--secondary photo-library-modal__btn"
                :disabled="deleting"
                @click="closeDeleteDialog"
              >
                {{ t("components.photo-library.cancel") }}
              </button>
              <button
                type="button"
                class="ui-settings-btn ui-settings-btn--secondary photo-library-modal__btn photo-library-modal__btn--danger"
                :disabled="deleting"
                @click="confirmDelete"
              >
                <span v-if="deleting" class="photo-library-card__spinner" aria-hidden="true" />
                {{ t("components.photo-library.confirm") }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import LoadingContainer from "@/components/LoadingContainer.vue";
import { computed, ref, onMounted, watch } from "vue";
import { useAuthStore } from "@/stores/authStore1";

const { t } = useI18n();
const authStore = useAuthStore();

const props = defineProps({
  userId: {
    type: String,
    required: false,
  },
  adminMode: {
    type: Boolean,
    default: false,
  },
});

const photos = ref([]);
const loading = ref(true);
const uploading = ref(false);
const selectedFile = ref(null);
const fileInputKey = ref(0);
const errorMessage = ref("");
const successMessage = ref("");
const deleteDialog = ref(false);
const deleteTarget = ref(null);
const deleting = ref(false);
const isAdminContext = computed(() => props.adminMode && !!props.userId);
const supportedMimeTypes = ["image/png", "image/jpeg", "image/webp"];
const getErrorMessage = (err, fallbackKey) =>
  err?.data?.error?.message ||
  err?.data?.message ||
  err?.statusMessage ||
  t(fallbackKey);
const isViewingOwnLibrary = computed(() => {
  if (isAdminContext.value) return true;
  if (!authStore.authResolved) return false;
  return !!props.userId && !!authStore.user?.id && props.userId === authStore.user.id;
});

const statusLabel = (status) =>
  t(`components.photo-library.status.${status || "pending"}`);

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};

const handleFileChange = (fileList) => {
  const file = Array.isArray(fileList) ? fileList[0] : fileList?.[0];
  if (file && !supportedMimeTypes.includes(String(file.type || "").toLowerCase())) {
    selectedFile.value = null;
    errorMessage.value = t("components.photo-library.upload-error");
    successMessage.value = "";
    fileInputKey.value += 1;
    return;
  }
  errorMessage.value = "";
  selectedFile.value = file || null;
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

const loadPhotos = async () => {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";
  if (!isAdminContext.value && !authStore.authResolved) {
    photos.value = [];
    return;
  }
  if (!isViewingOwnLibrary.value) {
    photos.value = [];
    loading.value = false;
    return;
  }
  try {
    const result = isAdminContext.value
      ? await $fetch("/api/admin/profile-photos/list", {
          query: { user_id: props.userId, limit: 200 },
        })
      : await $fetch("/api/profile/photos");
    photos.value = result?.photos || [];
  } catch (err) {
    console.error("[settings] load photos failed:", err);
    errorMessage.value = getErrorMessage(err, "components.photo-library.load-error");
  } finally {
    loading.value = false;
  }
};

const uploadPhoto = async () => {
  if (!selectedFile.value) {
    errorMessage.value = t("components.photo-library.upload-missing");
    return;
  }

  const maxBytes = 5 * 1024 * 1024;
  if (selectedFile.value.size > maxBytes) {
    errorMessage.value = t("components.photo-library.upload-too-large");
    return;
  }

  uploading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const dataUrl = await readFileAsDataUrl(selectedFile.value);
    const result = isAdminContext.value
      ? await $fetch("/api/admin/profile-photos/upload", {
          method: "POST",
          body: { dataUrl, userId: props.userId },
        })
      : await $fetch("/api/profile/photos", {
          method: "POST",
          body: { dataUrl },
        });

    if (result?.photo) {
      await loadPhotos();
      successMessage.value = t("components.photo-library.upload-success");
      selectedFile.value = null;
      fileInputKey.value += 1;
    } else {
      errorMessage.value = t("components.photo-library.upload-error");
    }
  } catch (err) {
    console.error("[settings] upload photo failed:", err);
    errorMessage.value = getErrorMessage(err, "components.photo-library.upload-error");
  } finally {
    uploading.value = false;
  }
};

const openDeleteDialog = (photo) => {
  deleteTarget.value = photo;
  deleteDialog.value = true;
};

const closeDeleteDialog = () => {
  deleteDialog.value = false;
  deleteTarget.value = null;
};

const confirmDelete = async () => {
  if (!deleteTarget.value?.id) return;
  deleting.value = true;
  errorMessage.value = "";
  try {
    if (isAdminContext.value) {
      await $fetch("/api/admin/profile-photos/delete", {
        method: "POST",
        body: { photoId: deleteTarget.value.id },
      });
    } else {
      await $fetch(`/api/profile/photos/${deleteTarget.value.id}`, {
        method: "DELETE",
      });
    }
    photos.value = photos.value.filter((photo) => photo.id !== deleteTarget.value.id);
    successMessage.value = t("components.photo-library.delete-success");
    closeDeleteDialog();
  } catch (err) {
    console.error("[settings] delete photo failed:", err);
    errorMessage.value = getErrorMessage(err, "components.photo-library.delete-error");
  } finally {
    deleting.value = false;
  }
};

onMounted(loadPhotos);

watch(
  () => [props.userId, props.adminMode, authStore.user?.id, authStore.authResolved],
  () => {
    loadPhotos();
  }
);
</script>

<style scoped>
.photo-library-card {
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface) / 0.96);
}

.photo-library-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.photo-library-card__title,
.photo-library-modal__title {
  margin: 0;
  font-size: 1rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.photo-library-card__refresh,
.photo-library-modal__btn {
  min-height: 2.3rem;
}

.photo-library-form__submit {
  min-height: 2.3rem;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground));
}

.photo-library-card__refresh:disabled,
.photo-library-form__submit:disabled,
.photo-library-modal__btn:disabled,
.photo-card__delete:disabled {
  opacity: 0.6;
  cursor: default;
}

.photo-library-card__spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: photo-library-spin 0.7s linear infinite;
}

.photo-library-form {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.photo-library-upload {
  display: grid;
  gap: 0.45rem;
}

.photo-library-upload__label,
.photo-library-form__hint,
.photo-library-empty,
.photo-library-modal__body {
  color: rgb(var(--color-foreground) / 0.72);
}

.photo-library-upload__input {
  width: 100%;
  min-height: 44px;
  padding: 0.65rem 0.85rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
}

.photo-library-form__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
}

.photo-library-form__hint,
.photo-library-empty {
  font-size: 0.82rem;
  line-height: 1.6;
}

.photo-library-status {
  margin-top: 0.9rem;
  padding: 0.8rem 0.95rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9rem;
}

.photo-library-status--error {
  background: rgb(var(--color-danger) / 0.1);
  border-color: rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}

.photo-library-status--success {
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.22);
  color: rgb(var(--color-success));
}

.photo-library-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

@media (min-width: 640px) {
  .photo-library-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 768px) {
  .photo-library-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.photo-card {
  overflow: hidden;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 14px;
  background: rgb(var(--color-surface));
}

.photo-card__image {
  display: block;
  width: 100%;
  aspect-ratio: 4 / 3;
  object-fit: contain;
  background: #0f172a;
}

.photo-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.6rem;
}

.photo-card__status {
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.photo-card__status--success {
  background: rgb(var(--color-success) / 0.12);
  color: rgb(var(--color-success));
}

.photo-card__status--error {
  background: rgb(var(--color-danger) / 0.12);
  color: rgb(var(--color-danger));
}

.photo-card__status--warning {
  background: rgb(var(--color-warning) / 0.12);
  color: rgb(var(--color-warning));
}

.photo-card__delete {
  width: 1.9rem;
  height: 1.9rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-danger));
}

.photo-card__delete:hover,
.photo-card__delete:focus-visible {
  outline: none;
  background: rgb(var(--color-danger) / 0.08);
}

.photo-library-modal {
  position: fixed;
  inset: 0;
  z-index: 2400;
}

.photo-library-modal__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.72);
}

.photo-library-modal__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(92vw, 420px);
  transform: translate(-50%, -50%);
  padding: 1.2rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(15 23 42 / 0.28);
}

.photo-library-modal__body {
  margin: 0.75rem 0 0;
  line-height: 1.6;
}

.photo-library-modal__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 1rem;
}

.photo-library-modal__btn--danger {
  border-color: transparent;
  background: rgb(var(--color-danger));
  color: white;
}

.photo-library-modal-fade-enter-active,
.photo-library-modal-fade-leave-active {
  transition: opacity 160ms ease;
}

.photo-library-modal-fade-enter-from,
.photo-library-modal-fade-leave-to {
  opacity: 0;
}

@keyframes photo-library-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
