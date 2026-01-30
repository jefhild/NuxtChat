<template>
  <v-row class="d-flex justify-center">
    <v-col cols="12">
      <v-form @submit.prevent="handleLogin">
        <v-row class="mb-2" no-gutters>
          <v-col class="d-flex justify-center">
            <v-btn-toggle v-model="mode" mandatory density="compact">
              <v-btn value="magic">{{ $t("components.loginEmail.sign-in") }}</v-btn>
              <v-btn value="otp">Email code</v-btn>
            </v-btn-toggle>
          </v-col>
        </v-row>

        <v-row class="mt-2">
          <v-col>
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              required
              variant="underlined"
              :rules="[emailRule]"
              :disabled="loading || otpSent"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row no-gutters>
          <v-col>
            <v-checkbox
              v-model="isAgeConfirmed"
              :rules="[(v) => !!v || $t('components.loginEmail.confirmAge') ]"
              @change="updateFormValidity"
              :disabled="loading || otpSent"
            >
              <template v-slot:label>
                <span id="checkboxLabel">
                  {{ $t("components.loginEmail.18years") }}
                </span>
              </template>
            </v-checkbox>
          </v-col>
        </v-row>

        <v-row no-gutters>
          <v-col class="d-flex justify-center">
            <v-btn
              type="submit"
              :disabled="loading || !isFormValid"
              color="primary"
            >
              {{ mode === "magic" ? "Send magic link" : "Send code" }}
            </v-btn>
          </v-col>
        </v-row>

        <v-row v-if="successMessage" class="mt-4">
          <v-col>
            <b>{{ $t("components.loginEmail.checkmail1") }}</b>
            {{ $t("components.loginEmail.checkmail2") }}
          </v-col>
        </v-row>

        <v-row v-if="otpSent" class="mt-4">
          <v-col>
            <v-text-field
              v-model="otpCode"
              label="6-digit code"
              inputmode="numeric"
              maxlength="6"
              variant="underlined"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row v-if="otpSent" no-gutters>
          <v-col class="d-flex justify-center">
            <v-btn
              type="button"
              :disabled="loading || !isOtpValid"
              color="primary"
              @click="handleVerifyOtp"
            >
              Verify code
            </v-btn>
          </v-col>
        </v-row>

        <v-row v-if="errorMessage" class="mt-3">
          <v-col>
            <div class="text-error">{{ errorMessage }}</div>
          </v-col>
        </v-row>
      </v-form>
    </v-col>
  </v-row>

  <v-row
    ><v-col>
      <p class="text-justify text-caption font-italic font-weight-light">
        {{ $t("components.loginEmail.registeredInfo") }}
        <NuxtLink :to="localPath('/terms')">{{ $t("components.loginEmail.terms") }}</NuxtLink>
      </p></v-col
    ></v-row
  >
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const localPath = useLocalePath();
const router = useRouter();
const { signInWithOtp, verifyEmailOtp } = useDb();
const config = useRuntimeConfig();

const loading = ref(false);
const email = ref("");
const successMessage = ref(false);
const otpSent = ref(false);
const otpCode = ref("");
const errorMessage = ref("");
const mode = ref("magic");
const isAgeConfirmed = ref(false);

const emailRule = (value) =>
  (!!value && /.+@.+\..+/.test(value)) || t("components.loginEmail.invalid-email");

const isFormValid = computed(() => {
  return emailRule(email.value) === true && isAgeConfirmed.value;
});

const isOtpValid = computed(() => /^\d{6}$/.test(otpCode.value.trim()));

const updateFormValidity = () => {
  // No need to manually set isFormValid since it's a computed property
};

// const handleLogin = async () => {
//   try {
//     loading.value = true;
//     await signInWithOtp(email.value);
//     successMessage.value = true;
//   } catch (error) {
//     alert(error.error_description || error.message);
//   } finally {
//     loading.value = false;
//   }
// };

const handleLogin = async () => {
  try {
    loading.value = true;
    errorMessage.value = "";
    successMessage.value = false;
    otpSent.value = false;
    await signInWithOtp(email.value, {
      next: "/chat",
      redirectTo: "/callback",
      mode: mode.value,
    });
    if (mode.value === "magic") {
      successMessage.value = true;
    } else {
      otpSent.value = true;
    }
  } catch (error) {
    errorMessage.value = error?.error_description || error?.message || "Login failed.";
  } finally {
    loading.value = false;
  }
};

const handleVerifyOtp = async () => {
  try {
    loading.value = true;
    errorMessage.value = "";
    const { error } = await verifyEmailOtp(email.value, otpCode.value.trim());
    if (error) throw error;
    router.replace(localPath("/callback?next=/chat"));
  } catch (error) {
    errorMessage.value = error?.error_description || error?.message || "Invalid code.";
  } finally {
    loading.value = false;
  }
};

watch(mode, () => {
  successMessage.value = false;
  otpSent.value = false;
  otpCode.value = "";
  errorMessage.value = "";
});

</script>
