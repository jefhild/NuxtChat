<template>
  <form class="login-email-card" @submit.prevent="handleLogin">
    <div class="login-email-card__mode">
      <button
        type="button"
        class="login-email-card__mode-btn"
        :class="{ 'is-active': mode === 'magic' }"
        @click="mode = 'magic'"
      >
        {{ $t("components.loginEmail.sign-in") }}
      </button>
      <button
        type="button"
        class="login-email-card__mode-btn"
        :class="{ 'is-active': mode === 'otp' }"
        @click="mode = 'otp'"
      >
        Email code
      </button>
    </div>

    <label class="login-email-card__field">
      <span>Email</span>
      <input
        v-model="email"
        type="email"
        required
        :disabled="loading || otpSent"
        autocomplete="email"
      >
    </label>

    <label class="login-email-card__check">
      <input
        v-model="isAgeConfirmed"
        type="checkbox"
        :disabled="loading || otpSent"
      >
      <span>{{ $t("components.loginEmail.18years") }}</span>
    </label>

    <button
      type="submit"
      class="login-email-card__submit"
      :class="{ 'is-loading': loading }"
      :disabled="loading || !isFormValid"
    >
      <span v-if="loading" class="login-email-card__spinner" aria-hidden="true" />
      <span>{{ mode === "magic" ? "Send magic link" : "Send code" }}</span>
    </button>

    <div v-if="successMessage" class="login-email-card__notice login-email-card__notice--success">
      <strong>{{ $t("components.loginEmail.checkmail1") }}</strong>
      {{ $t("components.loginEmail.checkmail2") }}
    </div>

    <template v-if="otpSent">
      <label class="login-email-card__field">
        <span>6-digit code</span>
        <input
          v-model="otpCode"
          inputmode="numeric"
          maxlength="6"
          autocomplete="one-time-code"
        >
      </label>

      <button
        type="button"
        class="login-email-card__submit"
        :class="{ 'is-loading': loading }"
        :disabled="loading || !isOtpValid"
        @click="handleVerifyOtp"
      >
        <span v-if="loading" class="login-email-card__spinner" aria-hidden="true" />
        <span>Verify code</span>
      </button>
    </template>

    <div v-if="errorMessage" class="login-email-card__notice login-email-card__notice--error">
      {{ errorMessage }}
    </div>

    <p class="login-email-card__legal">
      {{ $t("components.loginEmail.registeredInfo") }}
      <NuxtLink :to="localPath('/terms')">{{ $t("components.loginEmail.terms") }}</NuxtLink>
    </p>
  </form>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const localPath = useLocalePath();
const router = useRouter();
const { signInWithOtp, verifyEmailOtp } = useDb();

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

<style scoped>
.login-email-card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.login-email-card__mode {
  display: inline-flex;
  align-self: center;
  padding: 0.25rem;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.08);
}

.login-email-card__mode-btn {
  min-height: 38px;
  padding: 0.55rem 1rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.78);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}

.login-email-card__mode-btn.is-active {
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.login-email-card__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
  font-weight: 500;
}

.login-email-card__field input {
  width: 100%;
  min-height: 46px;
  padding: 0.8rem 0.95rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font: inherit;
}

.login-email-card__field input:focus-visible {
  outline: 2px solid rgb(var(--color-primary) / 0.28);
  outline-offset: 1px;
}

.login-email-card__check {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.82rem;
  line-height: 1.5;
}

.login-email-card__check input {
  width: 1rem;
  height: 1rem;
  margin-top: 0.15rem;
  accent-color: rgb(var(--color-primary));
}

.login-email-card__submit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.login-email-card__submit:hover:not(:disabled),
.login-email-card__submit:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 12px 24px rgb(var(--color-shadow) / 0.12);
  outline: none;
}

.login-email-card__submit:disabled {
  opacity: 0.6;
  cursor: default;
}

.login-email-card__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: login-email-spin 0.7s linear infinite;
}

.login-email-card__notice {
  padding: 0.85rem 0.95rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.login-email-card__notice--success {
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.22);
  color: rgb(var(--color-success));
}

.login-email-card__notice--error {
  background: rgb(var(--color-danger) / 0.1);
  border-color: rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}

.login-email-card__legal {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 0.8rem;
  line-height: 1.6;
  font-style: italic;
}

.login-email-card__legal a {
  color: rgb(var(--color-primary));
}

@keyframes login-email-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
