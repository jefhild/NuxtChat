<template>
  <v-row no-gutters>
    <v-col cols="12" class="d-flex justify-center">
      <v-form>
        <v-btn :disabled="!isFormValid" @click="handleAILogin" color="primary">
          Sign in With AI
        </v-btn>
      </v-form>
    </v-col>
  </v-row>
  <v-row no-gutters>
    <v-col class="mt-4">
      <v-checkbox
        v-model="isAgeConfirmed"
        :rules="[(v) => !!v || 'You must confirm your age']"
        @change="updateFormValidity"
      >
        <template v-slot:label>
          <span id="checkboxLabel">
            <p class="text-caption">
              I am 18 years of age or older and agree to the Terms of Service.
            </p>
          </span>
        </template>
      </v-checkbox>
    </v-col>
  </v-row>

  <v-row
    ><v-col
      ><p class="text-justify text-caption font-italic font-weight-light">
        Registered users can contact offline users, save favorites, share
        photos, use advanced filters and have a more complete AI experience.
        Google will share your name, email address, and profile picture with
        imchatty. By creating an account, you agree to our
        <NuxtLink to="/terms">Terms of Service.</NuxtLink>
      </p></v-col
    ></v-row
  >

  <v-dialog v-model="aiDialog" width="auto">
    <DialogAiSignUp @closeDialog="handleDialogClose" />
  </v-dialog>
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
