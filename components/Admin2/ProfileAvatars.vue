<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title>Profile Avatar Library</v-card-title>
    <v-card-text>
      <v-form ref="uploadForm" @submit.prevent="handleUpload">
        <v-select
          v-model="selectedGender"
          :items="genderOptions"
          label="Collection"
          item-title="title"
          item-value="value"
          variant="outlined"
          density="comfortable"
        />
        <v-file-input
          :key="fileInputKey"
          accept="image/*"
          label="Upload avatar"
          show-size
          @update:modelValue="handleFileChange"
        />
        <div class="d-flex align-center ga-2 mt-2">
          <v-btn
            color="primary"
            type="submit"
            :loading="uploading"
            :disabled="uploading || !selectedFile"
          >
            Upload
          </v-btn>
          <v-btn variant="text" :loading="loading" @click="loadAvatars">
            Refresh list
          </v-btn>
        </div>
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ errorMessage }}
        </v-alert>
        <v-alert
          v-else-if="successMessage"
          type="success"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ successMessage }}
        </v-alert>
      </v-form>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Current Collections</v-card-title>
    <LoadingContainer v-if="loading" text="Loading avatars..." />
    <v-card-text v-else>
      <div v-for="group in avatarGroups" :key="group.key" class="mb-6">
        <div class="text-subtitle-2 font-weight-medium mb-2">
          {{ group.label }} ({{ group.items.length }})
        </div>
        <div class="avatar-grid">
          <div
            v-if="!group.items.length"
            class="text-caption text-medium-emphasis"
          >
            No images yet.
          </div>
          <div
            v-for="item in group.items"
            :key="item.url"
            class="avatar-item"
          >
            <v-avatar size="48">
              <v-img :src="item.url" :alt="item.name" />
            </v-avatar>
            <v-btn
              icon
              size="x-small"
              color="red"
              variant="flat"
              class="avatar-delete"
              @click="openDeleteDialog(group.key, item.name)"
            >
              <v-icon size="14">mdi-close</v-icon>
            </v-btn>
          </div>
        </div>
      </div>
    </v-card-text>
  </v-card>

  <v-dialog v-model="deleteDialog" max-width="420">
    <v-card>
      <v-card-title>Delete avatar?</v-card-title>
      <v-card-text>
        This will remove the image from the shared collection.
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="deleting" @click="closeDeleteDialog">
          Cancel
        </v-btn>
        <v-btn color="red" :loading="deleting" @click="confirmDelete">
          Delete
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
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

const avatarGroups = computed(() => [
  { key: "male", label: "Male", items: avatars.value.male || [] },
  { key: "female", label: "Female", items: avatars.value.female || [] },
  { key: "other", label: "Other", items: avatars.value.other || [] },
]);

const handleFileChange = (file) => {
  if (Array.isArray(file)) {
    selectedFile.value = file[0] || null;
  } else {
    selectedFile.value = file || null;
  }
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

onMounted(async () => {
  await loadAvatars();
});
</script>

<style scoped>
.avatar-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.avatar-item {
  position: relative;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 999px;
  padding: 2px;
}

.avatar-delete {
  position: absolute;
  top: -6px;
  right: -6px;
  min-width: 20px;
  height: 20px;
}
</style>
