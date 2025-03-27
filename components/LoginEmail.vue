<template>
  <v-row class="d-flex justify-center" v-if="!successMessage">
    <v-col cols="12">
      <v-form @submit.prevent="handleLogin">
        <v-row no-gutters>
          <v-col class="d-flex justify-center">
            <v-btn
              type="submit"
              :disabled="loading || !isFormValid"
              color="primary"
            >
              Sign in with Email
            </v-btn>
          </v-col>
        </v-row>
        <v-row class="mt-4">
          <v-col>
            <v-text-field
              v-model="email"
              label="Email"
              type="email"
              required
              variant="underlined"
              :rules="[emailRule]"
            ></v-text-field>
          </v-col>
        </v-row>

        <v-row no-gutters>
          <v-col>
            <v-checkbox
              v-model="isAgeConfirmed"
              :rules="[(v) => !!v || 'You must confirm your age']"
              @change="updateFormValidity"
            >
              <template v-slot:label>
                <span id="checkboxLabel">
                  I am 18 years of age or older and agree to the Terms of
                  Service.
                </span>
              </template>
            </v-checkbox>
          </v-col>
        </v-row>
      </v-form>
    </v-col>
  </v-row>

  <v-row v-else
    ><v-col>
      <b>Check your email for the login link!</b> (It may be in your spam
      folder.)
    </v-col></v-row
  >

  <v-row
    ><v-col>
      <p class="text-justify text-caption font-italic font-weight-light">
        Registered users can contact offline users, save favorites, share photos
        and a bunch of other stuff. By creating an account, you agree to our
        <NuxtLink to="/terms">Terms of Service.</NuxtLink>
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
const { signInWithOtp } = useDb();
const config = useRuntimeConfig();

const loading = ref(false);
const email = ref("");
const successMessage = ref(false);
const isAgeConfirmed = ref(false);

const emailRule = (value) =>
  (!!value && /.+@.+\..+/.test(value)) || "Invalid email address";

const isFormValid = computed(() => {
  return emailRule(email.value) === true && isAgeConfirmed.value;
});

const updateFormValidity = () => {
  // No need to manually set isFormValid since it's a computed property
};

const handleLogin = async () => {
  try {
    loading.value = true;
    await signInWithOtp(email.value);
    // alert("Check your email for the login link!");
    successMessage.value = true;
  } catch (error) {
    alert(error.error_description || error.message);
  } finally {
    loading.value = false;
  }
};
</script>
