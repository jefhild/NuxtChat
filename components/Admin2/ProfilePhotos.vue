<template>
  <section class="admin-assets-card">
    <div class="admin-assets-card__header">
      <div>
        <h2 class="admin-assets-card__title">Photo Library Approvals</h2>
        <p class="admin-assets-card__subtitle">
          Review pending uploads, open the profile behind an image, and approve, reject, or remove assets.
        </p>
      </div>
      <div class="admin-assets-toolbar">
        <label class="admin-assets-field photo-status-select">
          <span class="admin-assets-field__label">Status</span>
          <select v-model="statusFilter" class="admin-assets-field__control">
            <option
              v-for="option in statusOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.title }}
            </option>
          </select>
        </label>
        <button
          type="button"
          class="admin-assets-button"
          :disabled="loading"
          @click="loadPhotos"
        >
          <span v-if="loading" class="admin-assets-button__spinner" aria-hidden="true" />
          Refresh
        </button>
      </div>
    </div>

    <div class="admin-assets-card__body">
      <div
        v-if="errorMessage"
        class="admin-assets-banner admin-assets-banner--error"
        role="alert"
      >
        {{ errorMessage }}
      </div>

      <LoadingContainer v-if="loading" text="Loading photos..." />

      <template v-else>
        <div v-if="!photos.length" class="admin-assets-empty-state">
          No photos found for this filter.
        </div>

        <div v-else class="photo-grid">
          <article
            v-for="photo in photos"
            :key="photo.id"
            class="photo-card"
          >
            <div class="photo-card__media-wrap">
              <NuxtImg
                :src="photo.url || photo.public_url"
                class="photo-card__media"
                alt=""
              />
            </div>

            <div class="photo-meta">
              <div class="photo-meta__row">
                <span class="photo-meta__label">Uploaded</span>
                <span>{{ formatDate(photo.created_at) }}</span>
              </div>
              <div class="photo-meta__row">
                <span class="photo-meta__label">User</span>
                <button
                  class="photo-user-link"
                  type="button"
                  @click="openProfile(photo)"
                >
                  {{ photo.displayname || truncateId(photo.user_id) }}
                </button>
              </div>
              <span
                class="photo-status-pill"
                :class="`photo-status-pill--${statusColor(photo.status)}`"
              >
                {{ statusLabel(photo.status) }}
              </span>
            </div>

            <div class="photo-actions">
              <button
                type="button"
                class="photo-action-btn photo-action-btn--success"
                :disabled="Boolean(actionLoading[photo.id])"
                :aria-label="`Approve photo ${photo.id}`"
                @click="approvePhoto(photo)"
              >
                <span v-if="actionLoading[photo.id] === 'approve'" class="admin-assets-button__spinner" aria-hidden="true" />
                <i v-else class="mdi mdi-check" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="photo-action-btn photo-action-btn--warning"
                :disabled="Boolean(actionLoading[photo.id])"
                :aria-label="`Reject photo ${photo.id}`"
                @click="rejectPhoto(photo)"
              >
                <span v-if="actionLoading[photo.id] === 'reject'" class="admin-assets-button__spinner" aria-hidden="true" />
                <i v-else class="mdi mdi-close" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="photo-action-btn photo-action-btn--danger"
                :disabled="Boolean(actionLoading[photo.id])"
                :aria-label="`Delete photo ${photo.id}`"
                @click="deletePhoto(photo)"
              >
                <span v-if="actionLoading[photo.id] === 'delete'" class="admin-assets-button__spinner" aria-hidden="true" />
                <i v-else class="mdi mdi-delete" aria-hidden="true" />
              </button>
            </div>
          </article>
        </div>
      </template>
    </div>
  </section>

  <ProfileDialog
    v-model="profileDialogOpen"
    :user-id="selectedUserId"
  />
</template>

<script setup>
import { ref, onMounted, watch } from "vue";
import LoadingContainer from "@/components/LoadingContainer.vue";
import ProfileDialog from "@/components/ProfileDialog.vue";

const photos = ref([]);
const loading = ref(true);
const errorMessage = ref("");
const statusFilter = ref("pending");
const actionLoading = ref({});
const profileDialogOpen = ref(false);
const selectedUserId = ref(null);

const statusOptions = [
  { title: "Pending", value: "pending" },
  { title: "Approved", value: "approved" },
  { title: "Rejected", value: "rejected" },
  { title: "All", value: "all" },
];

const statusLabel = (status) => {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
};

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
};

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
};

const truncateId = (value) => {
  if (!value) return "—";
  const str = String(value);
  return str.length > 8 ? `${str.slice(0, 4)}…${str.slice(-4)}` : str;
};

const openProfile = (photo) => {
  selectedUserId.value = photo?.user_id || null;
  profileDialogOpen.value = !!selectedUserId.value;
};

const loadPhotos = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const query = {};
    if (statusFilter.value && statusFilter.value !== "all") {
      query.status = statusFilter.value;
    }
    const result = await $fetch("/api/admin/profile-photos/list", {
      query,
    });
    photos.value = result?.photos || [];
  } catch (err) {
    console.error("[admin] load profile photos failed:", err);
    errorMessage.value = "Failed to load photo library.";
  } finally {
    loading.value = false;
  }
};

const updatePhotoStatus = (photoId, status) => {
  photos.value = photos.value.map((photo) =>
    photo.id === photoId ? { ...photo, status } : photo
  );
};

const removePhoto = (photoId) => {
  photos.value = photos.value.filter((photo) => photo.id !== photoId);
};

const setActionLoading = (photoId, action) => {
  actionLoading.value = { ...actionLoading.value, [photoId]: action };
};

const clearActionLoading = (photoId) => {
  const next = { ...actionLoading.value };
  delete next[photoId];
  actionLoading.value = next;
};

const approvePhoto = async (photo) => {
  if (!photo?.id) return;
  setActionLoading(photo.id, "approve");
  try {
    const result = await $fetch("/api/admin/profile-photos/approve", {
      method: "POST",
      body: { photoId: photo.id },
    });
    if (statusFilter.value === "pending") {
      removePhoto(photo.id);
    } else {
      updatePhotoStatus(photo.id, result?.photo?.status || "approved");
    }
  } catch (err) {
    console.error("[admin] approve photo failed:", err);
    errorMessage.value = "Failed to approve photo.";
  } finally {
    clearActionLoading(photo.id);
  }
};

const rejectPhoto = async (photo) => {
  if (!photo?.id) return;
  setActionLoading(photo.id, "reject");
  try {
    const result = await $fetch("/api/admin/profile-photos/reject", {
      method: "POST",
      body: { photoId: photo.id },
    });
    if (statusFilter.value === "pending") {
      removePhoto(photo.id);
    } else {
      updatePhotoStatus(photo.id, result?.photo?.status || "rejected");
    }
  } catch (err) {
    console.error("[admin] reject photo failed:", err);
    errorMessage.value = "Failed to reject photo.";
  } finally {
    clearActionLoading(photo.id);
  }
};

const deletePhoto = async (photo) => {
  if (!photo?.id) return;
  setActionLoading(photo.id, "delete");
  try {
    await $fetch("/api/admin/profile-photos/delete", {
      method: "POST",
      body: { photoId: photo.id },
    });
    removePhoto(photo.id);
  } catch (err) {
    console.error("[admin] delete photo failed:", err);
    errorMessage.value = "Failed to delete photo.";
  } finally {
    clearActionLoading(photo.id);
  }
};

watch(statusFilter, () => loadPhotos());

onMounted(loadPhotos);
</script>

<style scoped>
.admin-assets-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.admin-assets-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 0;
}

.admin-assets-card__title {
  margin: 0;
  color: rgb(var(--color-heading));
  font-size: 1.15rem;
  font-weight: 700;
}

.admin-assets-card__subtitle {
  margin: 6px 0 0;
  color: rgba(var(--color-text), 0.72);
  font-size: 0.92rem;
}

.admin-assets-card__body {
  padding: 20px 22px 22px;
}

.admin-assets-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
}

.admin-assets-field {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 6px;
}

.admin-assets-field__label {
  color: rgba(var(--color-text), 0.68);
  font-size: 0.82rem;
  font-weight: 600;
}

.admin-assets-field__control {
  min-height: 42px;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.94);
  color: rgb(var(--color-text));
  padding: 10px 12px;
  font-size: 0.95rem;
  outline: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
  color-scheme: light dark;
}

.admin-assets-field__control:focus {
  border-color: rgba(var(--color-primary), 0.5);
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.12);
}

.photo-status-select {
  min-width: 160px;
}

.admin-assets-button {
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

.admin-assets-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.admin-assets-button__spinner {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  border: 2px solid rgba(var(--color-text), 0.18);
  border-top-color: currentColor;
  animation: admin-assets-spin 0.8s linear infinite;
}

.admin-assets-banner {
  margin-bottom: 16px;
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.82);
  padding: 12px 14px;
  font-size: 0.95rem;
}

.admin-assets-banner--error {
  border-color: rgba(239, 68, 68, 0.35);
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.admin-assets-empty-state {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.85rem;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.photo-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgba(var(--color-border), 0.86);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.9);
}

.photo-card__media-wrap {
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: rgba(var(--color-surface-elevated), 0.94);
}

.photo-card__media {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px 0;
}

.photo-meta__row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: rgb(var(--color-text));
  font-size: 0.88rem;
}

.photo-meta__label {
  color: rgba(var(--color-text), 0.66);
  font-size: 0.76rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.photo-status-pill {
  align-self: flex-start;
  border-radius: 999px;
  padding: 4px 9px;
  font-size: 0.74rem;
  font-weight: 700;
}

.photo-status-pill--success {
  background: rgba(34, 197, 94, 0.12);
  color: rgb(22, 101, 52);
}

.photo-status-pill--warning {
  background: rgba(245, 158, 11, 0.14);
  color: rgb(180, 83, 9);
}

.photo-status-pill--danger {
  background: rgba(239, 68, 68, 0.12);
  color: rgb(185, 28, 28);
}

.photo-actions {
  display: flex;
  gap: 8px;
  padding: 12px 14px 14px;
  margin-top: auto;
}

.photo-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 1px solid transparent;
  background: rgba(var(--color-surface-elevated), 0.98);
}

.photo-action-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.photo-action-btn--success {
  color: rgb(22, 101, 52);
  border-color: rgba(34, 197, 94, 0.2);
}

.photo-action-btn--warning {
  color: rgb(180, 83, 9);
  border-color: rgba(245, 158, 11, 0.24);
}

.photo-action-btn--danger {
  color: rgb(185, 28, 28);
  border-color: rgba(239, 68, 68, 0.22);
}

.photo-user-link {
  align-self: flex-start;
  background: transparent;
  border: 0;
  padding: 0;
  color: rgb(var(--color-primary));
  cursor: pointer;
  font: inherit;
  text-align: left;
}

@media (max-width: 640px) {
  .admin-assets-card__header,
  .admin-assets-toolbar {
    align-items: stretch;
  }

  .photo-status-select,
  .admin-assets-button {
    width: 100%;
  }
}

@keyframes admin-assets-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
