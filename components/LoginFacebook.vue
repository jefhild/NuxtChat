<template>
  <v-row no-gutters>
    <v-col cols="12" class="d-flex justify-center">
      <v-form>
        <v-btn
          :disabled="!isFormValid"
          @click="handleFacebookLogin"
          color="primary"
        >
          Sign in With Facebook
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
            I am 18 years of age or older and agree to the Terms of Service.
          </span>
        </template>
      </v-checkbox>
    </v-col>
  </v-row>

  <v-row
    ><v-col>
      <p class="text-justify text-caption font-italic font-weight-light">
        Registered users can contact offline users, save favorites, share
        photos, use advanced filters and have a more complete AI experience.
        Facebook will share your name, email address, and profile picture with
        imchatty. By creating an account, you agree to our
        <NuxtLink :to="localPath('/terms')">Terms of Service.</NuxtLink>
      </p></v-col
    ></v-row
  >

  <!-- <v-row>
    <v-col cols="10">
      By creating an account, you agree to our
      <NuxtLink to="/terms">Terms of Service.</NuxtLink>
    </v-col>
  </v-row> -->
</template>

<script setup>
const localPath = useLocalePath();
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const isAgeConfirmed = ref(false);
const isFormValid = ref(false); // New reactive variable for form validity
const errorMessages = ref([]);

const updateFormValidity = () => {
  // console.log("Form validity updated");
  isFormValid.value = isAgeConfirmed.value;
};

const handleFacebookLogin = async () => {
  errorMessages.value = []; // Clear previous error messages

  try {
    await authStore.checkAuthFacebook();
  } catch (error) {
    console.error("Error submitting form:", error);
  }
};

// Ensure initial form validity state is set correctly
updateFormValidity();
</script>
