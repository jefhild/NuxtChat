<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <!-- Avatar -->
      <div class="photo-container">
        <NuxtImg
          v-if="previewAvatar"
          :src="previewAvatar"
          class="cover-image"
          alt="Profile Image"
        />
        <NuxtImg
          v-if="avatarDecorationURL"
          :src="avatarDecorationURL"
          class="avatar-decoration"
        />
      </div>

      <!-- Icon Row -->
      <v-row dense justify="center" class="icon-row mb-1" v-if="editable">
        <v-col cols="3" class="text-center">
          <v-tooltip text="Add Photo">
            <template #activator="{ props }">
              <v-btn
                icon
                flat
                size="x-small"
                v-bind="props"
                @click="openDialog"
              >
                <v-icon color="blue" size="16">mdi-plus</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>

        <v-col cols="3" class="text-center">
          <v-tooltip text="Add Decoration">
            <template #activator="{ props }">
              <v-btn
                icon
                flat
                size="x-small"
                v-bind="props"
                @click="toggleAvatarDecDialog"
              >
                <v-icon color="blue" size="16">mdi-brush</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>

        <v-col cols="3" class="text-center">
          <v-tooltip text="Shuffle Avatar">
            <template #activator="{ props }">
              <v-btn
                icon
                flat
                size="x-small"
                v-bind="props"
                @click="$emit('previewAvatar')"
              >
                <v-icon color="blue" size="16">mdi-shuffle</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>

        <v-col cols="3" class="text-center">
          <v-tooltip text="Save Avatar">
            <template #activator="{ props }">
              <v-btn
                icon
                flat
                size="x-small"
                v-bind="props"
                @click="$emit('confirmAvatar')"
              >
                <v-icon color="blue" size="16">mdi-content-save</v-icon>
              </v-btn>
            </template>
          </v-tooltip>
        </v-col>
      </v-row>
    </v-col>
  </v-row>

  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title>{{
        $t("components.profile-photo.upload-photo")
      }}</v-card-title>
      <v-card-text>
        <input type="file" @change="onFileChange" />
      </v-card-text>
      <v-card-actions>
        <!-- <v-btn color="primary" @click="uploadPhoto">{{
          $t("components.profile-photo.upload")
        }}</v-btn> -->
        <v-btn @click="dialog = false">{{
          $t("components.profile-photo.cancel")
        }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="avatarDecDialog" max-width="500">
    <SelectAvatarDecorationDialog
      :photopath="photopath"
      :userId="userId"
      @closeDialog="toggleAvatarDecDialog"
    />
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProfilePhoto } from "@/composables/useProfilePhoto";
// import { useI18n } from "vue-i18n";
// const { t } = useI18n();

const { hasEmail, getAvatarDecorationFromId } = useDb();
const isRegistered = ref(false);
const avatarDecorationURL = ref(null);

const props = defineProps({
  userId: { type: String, required: true },
  editable: { type: Boolean, default: true },
  avatarUrl: { type: String, default: "" },
});

const emit = defineEmits(["updateAvatarUrl", "previewAvatar", "confirmAvatar"]);
const dialog = ref(false);
const avatarDecDialog = ref(false);

const { photopath, getProfilePhoto, deletePhoto, handleFileChangeAndUpload } =
  useProfilePhoto();

const previewAvatar = computed(() => {
  return props.avatarUrl || photopath.value;
});

const openDialog = () => (dialog.value = true);

const toggleAvatarDecDialog = () => {
  avatarDecDialog.value = !avatarDecDialog.value;
  loadProfilePhoto();
};

// const handleDeletePhoto = async () => {
//   await deletePhoto(props.userId);
//   emit("updateAvatarUrl", photopath.value);
// };

const loadProfilePhoto = async () => {
  photopath.value = await getProfilePhoto(props.userId);
  avatarDecorationURL.value = await getAvatarDecorationFromId(props.userId);
};

const onFileChange = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (file) {
    const success = await handleFileChangeAndUpload(file, props.userId, emit);
    if (success) dialog.value = false;
  }
};

onMounted(async () => {
  await loadProfilePhoto();
  // isRegistered.value = await hasEmail(props.userId);
});
</script>

<style scoped>
.cover-image {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
}

.photo-container {
  position: relative;
}

.delete-btn {
  position: absolute;
  top: 0;
  right: 0;
  display: none;
}

.photo-container:hover .delete-btn {
  display: block;
}

.avatar-decoration {
  position: absolute;
  top: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 90px;
  pointer-events: none;
  object-fit: contain;
}
</style>
