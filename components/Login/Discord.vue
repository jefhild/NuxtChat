<template>
  <v-row no-gutters>
    <v-col cols="12" class="d-flex justify-center">
      <!-- Heading -->
      <h2 class="text-h5 mb-4">{{ $t("components.loginDiscord.sign-in") }}</h2>
    </v-col>

    <v-col cols="12" class="d-flex justify-center">
      <LoginOAuthButton
        :disabled="!isFormValid"
        provider="discord"
        label="Discord"
        icon="mdi-discord"
        color="green"
      />
    </v-col>
  </v-row>
  <v-row no-gutters>
    <v-col class="mt-4">
      <v-checkbox
        v-model="isAgeConfirmed"
        :rules="[(v) => !!v || $t('components.loginDiscord.confirmAge')]"
        @change="updateFormValidity"
      >
        <template v-slot:label>
          <span id="checkboxLabel">
            <p class="text-caption">
              {{ $t("components.loginDiscord.18years") }}
            </p>
          </span>
        </template>
      </v-checkbox>
    </v-col>
  </v-row>

  <v-row
    ><v-col
      ><p class="text-justify text-caption font-italic font-weight-light">
        {{ $t("components.loginDiscord.registeredInfo") }}
        <NuxtLink :to="localPath('/terms')">{{
          $t("components.loginEmail.terms")
        }}</NuxtLink>
      </p></v-col
    ></v-row
  >
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const localPath = useLocalePath();
// import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore1";

const authStore = useAuthStore();
const isAgeConfirmed = ref(false);
const isFormValid = ref(false); // New reactive variable for form validity
const errorMessages = ref([]);

const updateFormValidity = () => {
  // console.log("Form validity updated");
  isFormValid.value = isAgeConfirmed.value;
};


// Ensure initial form validity state is set correctly
updateFormValidity();
</script>
