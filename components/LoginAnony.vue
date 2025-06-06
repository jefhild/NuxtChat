<template>
  <!-- <v-container> -->
  <v-form ref="form" @submit.prevent="handleSubmit">
    <v-row no-gutters>
      <v-col cols="12">
        <!-- <NuxtTurnstile v-model="token" /> -->
        <DisplayNameField
          :displayName="displayName"
          :isEditable="true"
          @updateDisplayName="handleUpdateDisplayName"
          @validation="handleValidation"
        />
      </v-col>
    </v-row>

    <v-row no-gutters>
      <v-col cols="12" class="d-flex justify-end">
        <v-btn :disabled="!isFormValid" type="submit" color="primary"
          >Sign in Anonymously</v-btn
        >
      </v-col>
    </v-row>
  </v-form>
  <v-row no-gutters>
    <v-col cols="12">
      <v-checkbox
        v-model="isAgeConfirmed"
        :rules="[(v) => !!v || 'You must confirm your age']"
        @change="updateFormValidity"
      >
        <template v-slot:label>
          <span id="checkboxLabel"
            >I am 18 years of age or older and agree to the Terms of Service.</span
          >
        </template>
      </v-checkbox>
    </v-col>
  </v-row>
  <v-row>
    <v-col>
      <p class="text-justify">
      Anonymous users won't be able to save chats beyond this current session or contact offline users.
      Create an account and sign in with Google/Facebook/Email for a more feature-rich
      experience. </p>
    </v-col>
  </v-row>
  <v-row>
    <v-col cols="10">
      By creating an account, you agree to our
      <NuxtLink :to="localPath('/terms')">Terms of Service.</NuxtLink>
    </v-col>
  </v-row>
  <!-- </v-container> -->
</template>

<script setup>
const localPath = useLocalePath();
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const displayName = ref("");
const errorMessages = ref([]);
const isFormValid = ref(false);
const isAgeConfirmed = ref(false); // New reactive variable for the age checkbox
const router = useRouter();

const updateFormValidity = () => {
  // console.log("Form validity updated");
  const isDisplayNameValid = displayName.value.trim().length >= 4;
  isFormValid.value = isDisplayNameValid && isAgeConfirmed.value;
};

const handleUpdateDisplayName = (newDisplayName) => {
  displayName.value = newDisplayName;
  updateFormValidity();
};

const handleValidation = (isValid) => {
  updateFormValidity();
};

const handleSubmit = async () => {
  errorMessages.value = []; // Clear previous error messages

  if (!displayName.value.trim()) {
    errorMessages.value.push("Display Name cannot be blank");
    return;
  }

  if (!isAgeConfirmed.value) {
    errorMessages.value.push("You must confirm your age");
    return;
  }

  try {
    console.log("handleSubmit for loginAnony: ", displayName.value);
    await authStore.checkAuthAnony(displayName.value);
    // router.push("/settings");
    router.push({ path: localPath("/settings"), query: { edit: true } });
  } catch (error) {
    console.error("Error submitting form:", error);
    errorMessages.value = [error.message || "An error occurred"];
  }
};
</script>

<style>
#checkboxLabel {
  color: darkslategray;
  font-size: 12px;
}
</style>
