<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <!-- Avatar Selection -->
      <!-- photoPath: {{ photopath }} -->
      <div class="avatar-selection-container">
        <v-btn icon @click="handlePrevAvatar" :disabled="avatarIndex === 0">
          <v-icon>mdi-chevron-left</v-icon>
        </v-btn>
        <NuxtImg :src="photopath" class="avatar-image" />
        <v-btn
          icon
          @click="handleNextAvatar"
          :disabled="avatarIndex === avatars.length - 1"
        >
          <v-icon>mdi-chevron-right</v-icon>
        </v-btn>
      </div>


      <!-- <v-radio-group
        v-model="selectedGender"
        @change="loadAvatars"
        inline
        class="gender-selection-row"
      >
        <v-radio label="Male" value="male"></v-radio>
        <v-radio label="Female" value="female"></v-radio>
        <v-radio label="Other" value="other"></v-radio>
      </v-radio-group> -->

      <!-- Photo Upload Button -->
      <v-btn variant="text" color="blue" @click="handlePhotoChange">
        {{ photopath !== "" ? "Add My Photo" : "Add My Photo" }}
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
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useProfilePhoto } from "@/composables/useProfilePhoto";
import { useAuthStore } from "@/stores/authStore";
import { useSupabaseClient, useRuntimeConfig } from "#imports";

const props = defineProps({
  avatarUrl: {
    type: String,
    default: '/images/avatars/ai/male_avatar_1.webp',
  }
});

const authStore = useAuthStore();
const userId = authStore.user?.id;
const supabase = useSupabaseClient();
const config = useRuntimeConfig();
const photopath = ref(props.avatarUrl);

// Dialog for uploading photos
const dialog = ref(false);
const emit = defineEmits(["updateAvatarUrl"]);

// Import composable functions
const {
  selectedGender,
  avatars,
  avatarIndex,
  loadAvatars,
  prevAvatar,
  nextAvatar,
  file,
} = useProfilePhoto();




// Load avatars initially
loadAvatars();
photopath.value = avatars.value[avatarIndex.value]; // Initialize photopath with the first avatar

// Watch the selectedGender to update the avatars and photopath
watch(selectedGender, () => {
  loadAvatars();
  photopath.value = avatars.value[avatarIndex.value]; // Update photopath with the first avatar after gender change
  emit("updateAvatarUrl", photopath.value);
});

// Watch the avatarUrl prop for changes and update photopath accordingly
watch(() => props.avatarUrl, (newVal) => {
  photopath.value = newVal;
});

// Handles opening the dialog and loading avatars
const handlePhotoChange = () => {
  openDialog();
  loadAvatars();
};

// File input change handler
const onFileChange = (e) => {
  const target = e.target;
  if (target?.files) {
    file.value = target.files[0];
  }
};

// Upload photo function
const uploadPhoto = async () => {
  if (!file.value) return;

  const fileName = `${userId}`;
  const filePath = `profile-images/${fileName}`;

  const { data, error } = await supabase.storage
    .from("profile-images")
    .upload(filePath, file.value, { upsert: true });

  if (error) {
    console.error("Error uploading file:", error);
    return;
  }

  const publicURL = `${config.public.SUPABASE_BUCKET}${filePath}`;

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: publicURL })
    .eq("user_id", userId);

  if (updateError) {
    console.error("Error updating profile:", updateError);
  } else {
    photopath.value = `${publicURL}?t=${new Date().getTime()}`; // Update photopath with the uploaded image URL
    dialog.value = false;
  }
};

// Handles opening the dialog for photo upload
const openDialog = () => {
  dialog.value = true;
};

// Handle Previous Avatar Button Click
const handlePrevAvatar = () => {
  if (avatarIndex.value > 0) {
    prevAvatar();
    photopath.value = avatars.value[avatarIndex.value]; // Update photopath to the new avatar
    emit("updateAvatarUrl", photopath.value);
  }
};

// Handle Next Avatar Button Click
const handleNextAvatar = () => {
  if (avatarIndex.value < avatars.value.length - 1) {
    nextAvatar();
    photopath.value = avatars.value[avatarIndex.value]; // Update photopath to the new avatar
    emit("updateAvatarUrl", photopath.value);
  }
};
</script>

<style scoped>
.avatar-selection-container {
  display: flex;
  align-items: center;
  margin-top: 20px;
}

.avatar-image {
  width: 150px;
  height: 150px;
  object-fit: cover;
  border-radius: 50%;
  margin: 0 10px;
}

.v-radio-group {
  margin-top: 20px;
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.gender-selection-row {
  display: flex;
  flex-direction: row;
  justify-content: center;
  
}
</style>
