<template>
  <v-row no-gutters>
    <v-col cols="12" class="d-flex justify-center">
      <v-form>
        <v-btn
          :disabled="!isFormValid"
          @click="handleFacebookLogin"
          color="primary"
        >
        {{ $t("components.loginFacebook.sign-in") }}
        </v-btn>
      </v-form>
    </v-col>
  </v-row>
  <v-row no-gutters>
    <v-col class="mt-4">
      <v-checkbox
        v-model="isAgeConfirmed"
        :rules="[(v) => !!v || $t('components.loginEmail.confirmAge')]"
        @change="updateFormValidity"
      >
        <template v-slot:label>
          <span id="checkboxLabel">
            {{ $t("components.loginFacebook.18years") }}
          </span>
        </template>
      </v-checkbox>
    </v-col>
  </v-row>

  <v-row
    ><v-col>
      <p class="text-justify text-caption font-italic font-weight-light">
        {{ $t("components.loginFacebook.registeredInfo") }}
        <NuxtLink :to="localPath('/terms')">{{ $t("components.loginEmail.terms") }}</NuxtLink>
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
import { useI18n } from "vue-i18n";
const { t } = useI18n();

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
