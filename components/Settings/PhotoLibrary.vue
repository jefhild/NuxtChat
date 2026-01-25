<template>
  <v-card variant="outlined">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between">
      <span>{{ t("components.photo-library.title") }}</span>
      <v-btn
        size="small"
        variant="outlined"
        :loading="loading"
        @click="loadPhotos"
      >
        {{ t("components.photo-library.refresh") }}
      </v-btn>
    </v-card-title>
    <v-card-text>
      <v-form @submit.prevent="uploadPhoto" class="photo-library-form">
        <v-file-input
          :key="fileInputKey"
          accept="image/*"
          show-size
          :label="t('components.photo-library.add')"
          @update:modelValue="handleFileChange"
        />
        <div class="d-flex align-center ga-2">
          <v-btn
            color="primary"
            type="submit"
            :loading="uploading"
            :disabled="uploading || !selectedFile"
          >
            {{ t("components.photo-library.upload") }}
          </v-btn>
          <span class="text-caption text-medium-emphasis">
            {{ t("components.photo-library.requirements") }}
          </span>
        </div>
      </v-form>

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

      <LoadingContainer
        v-if="loading"
        :text="t('components.photo-library.loading')"
        class="mt-4"
      />
      <template v-else>
        <v-row v-if="photos.length" dense class="mt-4">
          <v-col v-for="photo in photos" :key="photo.id" cols="6" sm="4" md="3">
            <v-card variant="outlined" class="photo-card">
              <v-img :src="photo.url || photo.public_url" aspect-ratio="4/3" cover />
              <div class="d-flex align-center justify-space-between pa-2">
                <v-chip
                  size="x-small"
                  :color="statusColor(photo.status)"
                  variant="tonal"
                >
                  {{ statusLabel(photo.status) }}
                </v-chip>
                <v-btn
                  icon
                  size="x-small"
                  variant="text"
                  color="red"
                  :disabled="deleting"
                  @click="openDeleteDialog(photo)"
                >
                  <v-icon size="16">mdi-delete</v-icon>
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
        <p v-else class="text-caption text-medium-emphasis mt-4">
          {{ t("components.photo-library.empty") }}
        </p>
      </template>
    </v-card-text>
  </v-card>

  <v-dialog v-model="deleteDialog" max-width="420">
    <v-card>
      <v-card-title>{{ t("components.photo-library.delete-title") }}</v-card-title>
      <v-card-text>
        {{ t("components.photo-library.delete-body") }}
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" :disabled="deleting" @click="closeDeleteDialog">
          {{ t("components.photo-library.cancel") }}
        </v-btn>
        <v-btn color="red" :loading="deleting" @click="confirmDelete">
          {{ t("components.photo-library.confirm") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import LoadingContainer from "@/components/LoadingContainer.vue";
import { ref, onMounted } from "vue";

const { t } = useI18n();

const props = defineProps({
  userId: {
    type: String,
    required: false,
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

const statusLabel = (status) =>
  t(`components.photo-library.status.${status || "pending"}`);

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};

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

const loadPhotos = async () => {
  loading.value = true;
  errorMessage.value = "";
  try {
    const result = await $fetch("/api/profile/photos");
    photos.value = result?.photos || [];
  } catch (err) {
    console.error("[settings] load photos failed:", err);
    errorMessage.value = t("components.photo-library.load-error");
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
    const result = await $fetch("/api/profile/photos", {
      method: "POST",
      body: { dataUrl },
    });

    if (result?.photo) {
      photos.value = [result.photo, ...photos.value];
      successMessage.value = t("components.photo-library.upload-success");
      selectedFile.value = null;
      fileInputKey.value += 1;
    } else {
      errorMessage.value = t("components.photo-library.upload-error");
    }
  } catch (err) {
    console.error("[settings] upload photo failed:", err);
    errorMessage.value = t("components.photo-library.upload-error");
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
    await $fetch(`/api/profile/photos/${deleteTarget.value.id}`, {
      method: "DELETE",
    });
    photos.value = photos.value.filter((photo) => photo.id !== deleteTarget.value.id);
    successMessage.value = t("components.photo-library.delete-success");
    closeDeleteDialog();
  } catch (err) {
    console.error("[settings] delete photo failed:", err);
    errorMessage.value = t("components.photo-library.delete-error");
  } finally {
    deleting.value = false;
  }
};

onMounted(loadPhotos);
</script>

<style scoped>
.photo-library-form {
  display: grid;
  gap: 12px;
}

.photo-card {
  overflow: hidden;
}
</style>
