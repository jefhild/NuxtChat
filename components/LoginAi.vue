<template>
  <v-container class="fill-height d-flex align-center justify-center text-center">
    <v-row class="d-flex align-center">
      <v-col cols="6">
        <h1 class="text-h2 font-weight-bold">ImChatty</h1>
        <h2 class="text-title-1">A free anonymous chat platform</h2>
        <p class="text-subtitle-1 text-grey-darken-1">Chat with AI personas</p>
      </v-col>

      <v-col cols="6" >
        <DialogAiSignUp />
      </v-col>
    </v-row>
  </v-container>
</template>


<script setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const isAgeConfirmed = ref(false);
const isFormValid = ref(false); // New reactive variable for form validity
const errorMessages = ref([]);
const aiDialog = ref(false);

const updateFormValidity = () => {
  isFormValid.value = isAgeConfirmed.value;
};

function handleDialogClose() {
  // console.log('Dialog closed!');
  aiDialog.value = false;
}

const handleAILogin = async () => {
  errorMessages.value = []; // Clear previous error messages

  try {
    // await authStore.checkAuthGoogle();
    aiDialog.value = true;
    // console.log("AI login clicked");
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

// Ensure initial form validity state is set correctly
updateFormValidity();
</script>
