<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between ga-3">
      <span>Photo Library Approvals</span>
      <div class="d-flex align-center ga-2">
        <v-select
          v-model="statusFilter"
          :items="statusOptions"
          label="Status"
          variant="outlined"
          density="comfortable"
          hide-details
          class="photo-status-select"
        />
        <v-btn variant="text" :loading="loading" @click="loadPhotos">
          Refresh
        </v-btn>
      </div>
    </v-card-title>
    <v-card-text>
      <v-alert
        v-if="errorMessage"
        type="error"
        variant="tonal"
        density="compact"
        class="mb-4"
      >
        {{ errorMessage }}
      </v-alert>
      <LoadingContainer v-if="loading" text="Loading photos..." />
      <div v-else>
        <div v-if="!photos.length" class="text-caption text-medium-emphasis">
          No photos found for this filter.
        </div>
        <div v-else class="photo-grid">
          <v-card
            v-for="photo in photos"
            :key="photo.id"
            variant="outlined"
            class="photo-card"
          >
            <v-img :src="photo.url || photo.public_url" aspect-ratio="4/3" cover />
            <div class="photo-meta">
              <div class="text-caption text-medium-emphasis">
                {{ formatDate(photo.created_at) }}
              </div>
              <div class="text-caption text-medium-emphasis">
                User:
                <button
                  class="photo-user-link"
                  type="button"
                  @click="openProfile(photo)"
                >
                  {{ photo.displayname || truncateId(photo.user_id) }}
                </button>
              </div>
              <v-chip
                size="x-small"
                :color="statusColor(photo.status)"
                variant="tonal"
                class="mt-2"
              >
                {{ statusLabel(photo.status) }}
              </v-chip>
            </div>
            <v-card-actions class="photo-actions">
              <v-btn
                size="small"
                color="success"
                variant="text"
                :loading="actionLoading[photo.id] === 'approve'"
                @click="approvePhoto(photo)"
              >
                Approve
              </v-btn>
              <v-btn
                size="small"
                color="warning"
                variant="text"
                :loading="actionLoading[photo.id] === 'reject'"
                @click="rejectPhoto(photo)"
              >
                Reject
              </v-btn>
              <v-btn
                size="small"
                color="red"
                variant="text"
                :loading="actionLoading[photo.id] === 'delete'"
                @click="deletePhoto(photo)"
              >
                Delete
              </v-btn>
            </v-card-actions>
          </v-card>
        </div>
      </div>
    </v-card-text>
  </v-card>

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
  if (status === "rejected") return "error";
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
.photo-status-select {
  min-width: 160px;
}

.photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.photo-card {
  display: flex;
  flex-direction: column;
}

.photo-meta {
  padding: 10px 12px 0;
}

.photo-actions {
  margin-top: auto;
  justify-content: space-between;
  padding: 8px 12px 12px;
}

.photo-user-link {
  background: none;
  border: none;
  padding: 0;
  color: #1e88e5;
  cursor: pointer;
  font: inherit;
  text-decoration: underline;
}
</style>
