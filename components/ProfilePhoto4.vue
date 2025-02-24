<template>
  <v-row no-gutters>
    <v-col class="d-flex flex-column align-center">
      <!-- Avatar Selection -->
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
    </v-col>
  </v-row>
</template>

<script setup>
import { ref, watch } from "vue";
import { useAvatars } from "@/composables/useAvatars";
import { useAuthStore } from "@/stores/authStore";

// Define props, update selectedGender to be a number (genderId)
const props = defineProps({
  avatarUrl: {
    type: String,
    default: '/images/avatars/ai/male_avatar_1.webp',
  },
  selectedGender: {
    type: Number, // Use genderId directly
    default: 1, // Default to male (id = 1)
  },
});

const authStore = useAuthStore();
const photopath = ref(props.avatarUrl);
const emit = defineEmits(["updateAvatarUrl"]);

// Import composable functions from useAvatars
const {
  avatars,
  avatarIndex,
  loadAvatars,
  prevAvatar,
  nextAvatar,
} = useAvatars(); 

// Load avatars initially based on the selectedGender (genderId)
loadAvatars(props.selectedGender); // Use genderId directly
photopath.value = avatars.value[avatarIndex.value]; // Initialize photopath with the first avatar

// Watch the selectedGender prop for changes and reload avatars
watch(() => props.selectedGender, (newGenderId) => {
  loadAvatars(newGenderId); // Pass genderId directly
  photopath.value = avatars.value[avatarIndex.value]; // Update photopath with the first avatar after gender change
  emit("updateAvatarUrl", photopath.value);
});

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
</style>