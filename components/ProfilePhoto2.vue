<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <v-btn v-if="editable" variant="text" color="blue" @click="openDialog">Add Photo</v-btn>
      <div class="photo-container">
        <NuxtImg v-if="photopath" :src="photopath" class="cover-image" alt="Profile Image"/>
        <NuxtImg v-if="avatarDecorationURL" :src="avatarDecorationURL" class="avatar-decoration" />
        <v-btn v-if="photopath && editable" icon class="delete-btn" @click="handleDeletePhoto">
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </div>
      <v-btn v-if="editable && isRegistered" variant="text" color="blue" @click="toggleAvatarDecDialog"
        class="text-caption text-sm-body-2 text-md-body-1 mx-auto" block>
        Add Avatar Decoration
      </v-btn>
    </v-col>
  </v-row>

  <v-dialog v-model="dialog" max-width="500">
    <v-card>
      <v-card-title>Upload Profile Photo</v-card-title>
      <v-card-text>
        <input type="file" @change="onFileChange" />
      </v-card-text>
      <v-card-actions>
        <v-btn color="primary" @click="uploadPhoto">Upload</v-btn>
        <v-btn @click="dialog = false">Cancel</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="avatarDecDialog" max-width="700">
    <SelectAvatarDecorationDialog :photopath="photopath" :userId="userId" @closeDialog="toggleAvatarDecDialog"/>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProfilePhoto } from "@/composables/useProfilePhoto";

const { hasEmail, getAvatarDecorationFromId } = useDb();
const isRegistered = ref(false);
const avatarDecorationURL = ref(null);

const props = defineProps({
  userId: {
    type: String,
    required: true,
  },
  editable: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(["updateAvatarUrl"]);
const dialog = ref(false);
const avatarDecDialog = ref(false);
const { photopath, file, getProfilePhoto, uploadImage, deletePhoto } =
  useProfilePhoto();

const openDialog = () => {
  dialog.value = true;
};

const toggleAvatarDecDialog = () => {
  avatarDecDialog.value = !avatarDecDialog.value;
  loadProfilePhoto(); // Load the profile photo when the dialog is opened
};

const handleDeletePhoto = async () => {
  await deletePhoto(props.userId); // Ensure the correct userId is passed here
    emit("updateAvatarUrl", photopath.value);
};

const loadProfilePhoto = async () => {
  photopath.value = await getProfilePhoto(props.userId);
  // console.log("photopath.value", photopath.value);
  avatarDecorationURL.value = await getAvatarDecorationFromId(
    props.userId
  );
};

const onFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  if (target?.files) {
    file.value = target.files[0];
  }
};

const uploadPhoto = async () => {
  await uploadImage(props.userId, emit);
  dialog.value = false; // Close the dialog after the image is uploaded
};

onMounted(async () => {
  await loadProfilePhoto();
  isRegistered.value = await hasEmail(props.userId);
 } );
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
