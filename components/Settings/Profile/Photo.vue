<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <v-card class="profile-photo-card" elevation="1">
        <div class="photo-hero">
          <NuxtImg
            v-if="previewAvatar"
            :src="previewAvatar"
            class="photo-hero-image"
            alt="Profile Image"
          />
          <div v-else class="photo-hero-placeholder">
            <v-icon size="40" color="grey-lighten-2">mdi-account</v-icon>
          </div>
          <div class="photo-hero-overlay">
            <div class="photo-line">
              <span class="photo-name">{{ userProfile?.displayname }}</span>
              <span class="photo-dot">•</span>
              <span class="photo-tagline">{{ userProfile?.tagline }}</span>
              <a
                v-if="userProfile?.site_url"
                class="photo-link"
                :href="userProfile.site_url"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Open public site"
              >
                <v-icon size="18" color="white">mdi-link-variant</v-icon>
              </a>
            </div>
          </div>
        </div>

        <div class="photo-actions">
          <div class="d-flex align-center justify-center" style="gap: 8px;">
            <v-btn
              size="small"
              variant="outlined"
              color="primary"
              :loading="randomLoading"
              :disabled="!editable || randomLoading"
              @click="editable && $emit('randomAvatar')"
            >
              Random photo
            </v-btn>
            <v-btn
              size="small"
              variant="outlined"
              color="primary"
              :loading="uploadLoading"
              :disabled="!editable || uploadLoading"
              @click="editable && triggerFilePicker()"
            >
              Upload
            </v-btn>
            <input
              ref="fileInput"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="sr-only"
              @change="onFileChange"
            />
          </div>
          <v-alert
            v-if="errorMessage"
            type="error"
            variant="tonal"
            density="compact"
            class="mt-2"
          >
            {{ errorMessage }}
          </v-alert>
        </div>
        <div
          v-if="userProfile?.user_id"
          class="photo-lookingfor"
          :class="{ 'lookingfor-disabled': !editable }"
        >
          <SettingsProfileLookingForMenu
            :userProfile="userProfile"
            :refreshLookingForMenu="refreshLookingForMenu"
            :disabled="!editable"
            @lookingForUpdated="editable && $emit('lookingForUpdated')"
          />
          <div class="lookingfor-icons">
            <SettingsProfileLookingForDisplay
              :key="displayKey"
              :userId="userProfile.user_id"
            />
          </div>
        </div>
      </v-card>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const props = defineProps({
  userId: { type: String, required: true },
  editable: { type: Boolean, default: true },
  avatarUrl: { type: String, default: "" },
  randomLoading: { type: Boolean, default: false },
  uploadLoading: { type: Boolean, default: false },
  errorMessage: { type: String, default: "" },
  userProfile: { type: Object, default: null },
  refreshLookingForMenu: { type: Boolean, default: false },
  displayKey: { type: Number, default: 0 },
});

const emit = defineEmits([
  "updateAvatarUrl",
  "randomAvatar",
  "uploadAvatar",
  "lookingForUpdated",
]);
const fileInput = ref<HTMLInputElement | null>(null);

const previewAvatar = computed(() => {
  return props.avatarUrl || "";
});

const triggerFilePicker = () => {
  if (fileInput.value) {
    fileInput.value.value = "";
    fileInput.value.click();
  }
};

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    emit("uploadAvatar", file);
  }
};
</script>

<style scoped>
.profile-photo-card {
  width: 100%;
  max-width: 360px;
  border-radius: 14px;
  overflow: hidden;
}

.photo-hero {
  position: relative;
  height: 160px;
  background: #101010;
}

.photo-hero-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.photo-hero-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1c1c1c, #2a2a2a);
}

.photo-hero-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0) 30%, rgba(0, 0, 0, 0.75) 100%);
}

.photo-line {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #fff;
  font-size: 0.95rem;
  white-space: nowrap;
}

.photo-name {
  font-weight: 600;
}

.photo-tagline {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.photo-dot {
  color: rgba(255, 255, 255, 0.6);
}

.photo-link {
  display: inline-flex;
  align-items: center;
  color: inherit;
}

.photo-actions {
  padding: 12px;
  text-align: center;
  min-height: 92px;
}

.photo-lookingfor {
  padding: 10px 12px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  min-height: 44px;
}

.menu-disabled {
  opacity: 0.5;
  pointer-events: none;
}

.lookingfor-disabled {
  opacity: 0.6;
}

.lookingfor-icons {
  min-width: 120px;
  display: flex;
  justify-content: center;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}
</style>
