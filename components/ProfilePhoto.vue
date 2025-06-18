<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <v-btn v-if="editable" variant="text" color="blue" @click="openDialog">{{
        $t("components.profile-photo.add-photo")
      }}</v-btn>
      <div class="photo-container">
        <NuxtImg
          v-if="photopath"
          :src="photopath"
          class="cover-image"
          alt="Profile Image"
        />
        <NuxtImg
          v-if="avatarDecorationURL"
          :src="avatarDecorationURL"
          class="avatar-decoration"
        />
        <v-btn
          v-if="photopath && editable"
          icon
          class="delete-btn"
          @click="handleDeletePhoto"
        >
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </div>
      <v-btn
        v-if="editable && isRegistered"
        variant="text"
        color="blue"
        @click="toggleAvatarDecDialog"
        class="text-caption text-sm-body-2 text-md-body-1 mx-auto"
        block
      >
        {{ $t("components.profile-photo.add-avatar-deco") }}
      </v-btn>
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

  <v-dialog v-model="avatarDecDialog" max-width="700">
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
});

const emit = defineEmits(["updateAvatarUrl"]);
const dialog = ref(false);
const avatarDecDialog = ref(false);

const {
  photopath,
  getProfilePhoto,
  deletePhoto,
  handleFileChangeAndUpload,
} = useProfilePhoto();

const openDialog = () => (dialog.value = true);

const toggleAvatarDecDialog = () => {
  avatarDecDialog.value = !avatarDecDialog.value;
  loadProfilePhoto();
};

const handleDeletePhoto = async () => {
  await deletePhoto(props.userId);
  emit("updateAvatarUrl", photopath.value);
};

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
  isRegistered.value = await hasEmail(props.userId);
});
</script>

<style scoped>
.cover-image {
  width: 120px;
  height: 120px;
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
  top: -13px;
  left: 50%;
  transform: translateX(-50%);
  width: 145px;
  pointer-events: none;
  object-fit: contain;
}
</style>
