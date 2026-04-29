<template>
  <Teleport to="body">
    <Transition name="convert-dialog-fade">
      <div
        v-if="modelValue"
        class="convert-dialog"
        role="presentation"
      >
        <button
          type="button"
          class="convert-dialog__scrim"
          aria-label="Close convert account dialog"
          @click="close"
        />
        <div
          class="convert-dialog__panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="convert-dialog-title"
        >
          <h2 id="convert-dialog-title" class="convert-dialog__title">
            {{ title }}
          </h2>

          <div class="convert-dialog__body">
            <p class="convert-dialog__description">
              {{ description }}
            </p>

            <button
              type="button"
              class="convert-dialog__oauth"
              @click="handleGoogle"
            >
              <i class="mdi mdi-google" aria-hidden="true" />
              <span>Continue with Google</span>
            </button>

            <div class="convert-divider">
              <span>or use email</span>
            </div>

            <label class="convert-dialog__field">
              <span>Email</span>
              <input
                v-model="form.email"
                type="email"
                autocomplete="email"
              >
            </label>
            <label class="convert-dialog__field">
              <span>Confirm Email</span>
              <input
                v-model="form.confirmEmail"
                type="email"
                autocomplete="email"
              >
            </label>

            <div v-if="errorMsg" class="convert-dialog__status convert-dialog__status--error">
              {{ errorMsg }}
            </div>
            <div v-else-if="successMsg" class="convert-dialog__status convert-dialog__status--success">
              {{ successMsg }}
            </div>
          </div>

          <div class="convert-dialog__actions">
            <button type="button" class="convert-dialog__button convert-dialog__button--secondary" @click="close">
              Cancel
            </button>
            <button
              type="button"
              class="convert-dialog__button convert-dialog__button--primary"
              :disabled="!!successMsg || submitting"
              @click="handleEmail"
            >
              <span v-if="submitting" class="convert-dialog__spinner" aria-hidden="true" />
              <span>Send confirmation link</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed } from "vue";
import { useDb } from "@/composables/useDB";
import { useAuthStore } from "@/stores/authStore1";
import { linkGoogleIdentity } from "@/composables/useAuthFlow";

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  context: { type: String, default: "general" }, // "away-agent" | "general"
});

const emit = defineEmits(["update:modelValue", "converted"]);

const { updateUserEmail } = useDb();
const authStore = useAuthStore();

const form = reactive({ email: "", confirmEmail: "" });
const submitting = ref(false);
const errorMsg = ref("");
const successMsg = ref("");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const title = computed(() =>
  props.context === "away-agent"
    ? "Activate your Away Agent"
    : "Save your account"
);

const description = computed(() =>
  props.context === "away-agent"
    ? "Your Away Agent needs a registered account so it knows who you are when you come back. Add your email to convert your anonymous account — your profile and chat history stay intact."
    : "Add your email to save your account. Your profile and chat history stay intact."
);

const postConvertPath = computed(() =>
  props.context === "away-agent" ? "/settings?section=agent&tab=8" : "/settings"
);

function close() {
  if (submitting.value) return;
  form.email = "";
  form.confirmEmail = "";
  errorMsg.value = "";
  successMsg.value = "";
  emit("update:modelValue", false);
}

async function handleGoogle() {
  await linkGoogleIdentity(postConvertPath.value);
}

async function handleEmail() {
  errorMsg.value = "";
  successMsg.value = "";

  const email = form.email.trim().toLowerCase();
  const confirm = form.confirmEmail.trim().toLowerCase();

  if (!emailPattern.test(email)) {
    errorMsg.value = "Please enter a valid email address.";
    return;
  }
  if (email !== confirm) {
    errorMsg.value = "Email addresses must match.";
    return;
  }

  submitting.value = true;
  try {
    const { error } = await updateUserEmail(email);
    if (error) throw error;
    successMsg.value = "Check your inbox for the confirmation link.";
    await authStore.checkAuth();
    emit("converted");
  } catch (err) {
    errorMsg.value = err?.message || "Something went wrong. Please try again.";
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.convert-dialog {
  position: fixed;
  inset: 0;
  z-index: 2300;
}

.convert-dialog__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.64);
}

.convert-dialog__panel {
  position: absolute;
  top: 50%;
  left: 50%;
  width: min(calc(100% - 2rem), 480px);
  transform: translate(-50%, -50%);
  padding: 1.25rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 18px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.18);
}

.convert-dialog__title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 650;
  color: rgb(var(--color-foreground));
}

.convert-dialog__body {
  margin-top: 0.85rem;
}

.convert-dialog__description {
  margin: 0 0 1rem;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 0.94rem;
  line-height: 1.6;
}

.convert-dialog__oauth,
.convert-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  min-height: 42px;
  border-radius: 12px;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 160ms ease, opacity 160ms ease;
}

.convert-dialog__oauth {
  width: 100%;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground));
}

.convert-divider {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 1rem 0;
}
.convert-divider::before,
.convert-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgb(var(--color-border) / 0.72);
}

.convert-divider span {
  color: rgb(var(--color-foreground) / 0.62);
  font-size: 0.78rem;
}

.convert-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.75rem;
  color: rgb(var(--color-foreground) / 0.82);
  font-size: 0.9rem;
  font-weight: 500;
}

.convert-dialog__field input {
  width: 100%;
  min-height: 44px;
  padding: 0.75rem 0.9rem;
  border: 1px solid rgb(var(--color-border) / 0.82);
  border-radius: 12px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font: inherit;
}

.convert-dialog__status {
  margin-top: 0.85rem;
  padding: 0.8rem 0.9rem;
  border: 1px solid transparent;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
}

.convert-dialog__status--error {
  background: rgb(var(--color-danger) / 0.1);
  border-color: rgb(var(--color-danger) / 0.22);
  color: rgb(var(--color-danger));
}

.convert-dialog__status--success {
  background: rgb(var(--color-success) / 0.12);
  border-color: rgb(var(--color-success) / 0.22);
  color: rgb(var(--color-success));
}

.convert-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.convert-dialog__button {
  min-width: 140px;
  padding: 0.7rem 1rem;
}

.convert-dialog__button--primary {
  border: 0;
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground, var(--color-background)));
}

.convert-dialog__button--secondary {
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: transparent;
  color: rgb(var(--color-foreground) / 0.82);
}

.convert-dialog__button:disabled {
  opacity: 0.6;
  cursor: default;
}

.convert-dialog__spinner {
  width: 0.95rem;
  height: 0.95rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: convert-dialog-spin 0.7s linear infinite;
}

.convert-dialog-fade-enter-active,
.convert-dialog-fade-leave-active {
  transition: opacity 160ms ease;
}

.convert-dialog-fade-enter-from,
.convert-dialog-fade-leave-to {
  opacity: 0;
}

@keyframes convert-dialog-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
