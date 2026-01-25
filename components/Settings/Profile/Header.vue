<template>
  <v-row no-gutters justify="center">
    <v-col
      cols="12"
      :md="showPhotoLibrary ? 6 : 12"
      class="d-flex flex-column align-center"
    >
      <!-- {{ isEditable ? "Edit Mode" : "View Mode" }} -->
      <SettingsProfilePhoto
        :editable="isEditable"
        :userId="userProfile.user_id"
        :avatarUrl="avatar"
        :randomLoading="randomLoading"
        :uploadLoading="uploadLoading"
        :errorMessage="errorMessage"
        :userProfile="userProfile"
        :refreshLookingForMenu="refreshLookingForMenu"
        :displayKey="displayKey"
        @updateAvatarUrl="$emit('updateAvatarUrl', $event)"
        @randomAvatar="$emit('randomAvatar')"
        @uploadAvatar="$emit('uploadAvatar', $event)"
        @lookingForUpdated="$emit('refreshLookingForDisplay')"
      />
    </v-col>
    <v-col
      v-if="showPhotoLibrary"
      cols="12"
      md="6"
      class="d-flex flex-column align-center mt-4 mt-md-0"
    >
        <v-card variant="tonal" class="photo-library-card">
        <v-card-text class="photo-library-body">
          <v-row dense>
            <v-col v-for="(item, idx) in photoSlots" :key="idx" cols="6" sm="4">
              <v-card v-if="item" variant="outlined" class="photo-library-thumb">
                <v-img :src="item.url || item.public_url" aspect-ratio="4/3" cover />
                <div class="photo-library-status">
                  <v-chip
                    size="x-small"
                    :color="statusColor(item.status)"
                    variant="tonal"
                  >
                    {{ statusLabel(item.status) }}
                  </v-chip>
                </div>
              </v-card>
              <v-skeleton-loader
                v-else
                type="image"
                class="photo-library-skeleton"
              />
            </v-col>
          </v-row>
        </v-card-text>
        <v-card-actions class="photo-library-actions">
          <v-btn
            variant="text"
            size="small"
            class="photo-library-link text-caption"
            @click="$emit('openPhotoLibrary')"
          >
            {{ t("components.photo-library.link") }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { computed } from "vue";

const { t } = useI18n();

const props = defineProps({
  userProfile: Object,
  avatar: String,
  isEditable: Boolean,
  refreshLookingForMenu: Boolean,
  displayKey: Number,
  randomLoading: Boolean,
  uploadLoading: Boolean,
  errorMessage: String,
  showPhotoLibrary: Boolean,
  photoLibraryPhotos: {
    type: Array,
    default: () => [],
  },
});

defineEmits([
  "updateAvatarUrl",
  "refreshLookingForDisplay",
  "randomAvatar",
  "uploadAvatar",
  "openPhotoLibrary",
]);

const photoSlots = computed(() => {
  const items = Array.isArray(props.photoLibraryPhotos)
    ? props.photoLibraryPhotos
    : [];
  return Array.from({ length: 6 }, (_, idx) => items[idx] || null);
});

const statusLabel = (status) =>
  t(`components.photo-library.status.${status || "pending"}`);

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "error";
  return "warning";
};
</script>

<style scoped>
:deep(.profile-photo-card) {
  width: 100%;
  max-width: 360px;
}

.photo-library-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 360px;
  height: 300px;
}

.photo-library-body {
  flex: 1 1 auto;
  padding-top: 10px;
  padding-bottom: 6px;
  max-height: 210px;
  overflow: auto;
}

.photo-library-skeleton {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
}

.photo-library-thumb {
  position: relative;
  overflow: hidden;
}

.photo-library-status {
  position: absolute;
  left: 6px;
  bottom: 6px;
}

.photo-library-actions {
  margin-top: auto;
  justify-content: flex-end;
  padding: 0 12px 10px;
}

.photo-library-link {
  letter-spacing: 0.02em;
}
</style>
