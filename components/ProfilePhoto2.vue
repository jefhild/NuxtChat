<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <v-btn v-if="editable" variant="text" color="blue" @click="openDialog">Add Photo</v-btn>
      <div class="photo-container">
        <NuxtImg v-if="photopath" :src="photopath" class="cover-image" />
        <v-btn v-if="photopath && editable" icon class="delete-btn" @click="handleDeletePhoto">
          <v-icon size="small">mdi-delete</v-icon>
        </v-btn>
      </div>
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
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useProfilePhoto } from "@/composables/useProfilePhoto";

const { hasEmail } = useDb();
const isRegistered = ref(false);

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
const { photopath, file, getProfilePhoto, uploadImage, deletePhoto } =
  useProfilePhoto();

const openDialog = () => {
  dialog.value = true;
};

const handleDeletePhoto = async () => {
  await deletePhoto(props.userId); // Ensure the correct userId is passed here
    emit("updateAvatarUrl", photopath.value);
};

const loadProfilePhoto = async () => {
  photopath.value = await getProfilePhoto(props.userId);
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
  width: 100%;
  height: 100%;
  max-width: 100%;
  max-height: 100%;
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
</style>
