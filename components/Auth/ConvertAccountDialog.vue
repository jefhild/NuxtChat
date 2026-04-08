<template>
  <v-dialog
    :model-value="modelValue"
    max-width="480"
    :retain-focus="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="text-h6 pt-5 pb-1 px-5">
        {{ title }}
      </v-card-title>

      <v-card-text class="px-5 pb-2">
        <p class="text-body-2 mb-5 text-medium-emphasis">
          {{ description }}
        </p>

        <!-- Google / OAuth option -->
        <v-btn
          variant="outlined"
          block
          class="mb-4"
          prepend-icon="mdi-google"
          @click="handleGoogle"
        >
          Continue with Google
        </v-btn>

        <div class="convert-divider mb-4">
          <span class="text-caption text-medium-emphasis">or use email</span>
        </div>

        <!-- Email path -->
        <v-text-field
          v-model="form.email"
          type="email"
          label="Email"
          autocomplete="email"
          variant="outlined"
          density="compact"
          class="mb-2"
        />
        <v-text-field
          v-model="form.confirmEmail"
          type="email"
          label="Confirm Email"
          autocomplete="email"
          variant="outlined"
          density="compact"
        />

        <v-alert v-if="errorMsg" type="error" variant="tonal" class="mt-3">
          {{ errorMsg }}
        </v-alert>
        <v-alert v-else-if="successMsg" type="success" variant="tonal" class="mt-3">
          {{ successMsg }}
        </v-alert>
      </v-card-text>

      <v-card-actions class="justify-end px-5 pb-4">
        <v-btn variant="text" @click="close">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="submitting"
          :disabled="!!successMsg"
          @click="handleEmail"
        >
          Send confirmation link
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
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

function close() {
  if (submitting.value) return;
  form.email = "";
  form.confirmEmail = "";
  errorMsg.value = "";
  successMsg.value = "";
  emit("update:modelValue", false);
}

async function handleGoogle() {
  await linkGoogleIdentity();
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
.convert-divider {
  display: flex;
  align-items: center;
  gap: 8px;
}
.convert-divider::before,
.convert-divider::after {
  content: "";
  flex: 1;
  height: 1px;
  background: rgba(var(--v-border-color), var(--v-border-opacity));
}
</style>
