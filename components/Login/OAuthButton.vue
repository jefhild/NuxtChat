<template>
  <v-btn
    :color="resolvedColor"
    :prepend-icon="icon"
    :loading="loading"
    :disabled="loading || disabled"
    block
    class="mb-2 oauth-btn"
    :class="`oauth-btn--${provider}`"
    @click="handleOAuth"
  >
    Sign in with {{ label }}
  </v-btn>
</template>

<script setup>
import { computed, ref } from "vue";
import { useDb } from "@/composables/useDB";

const props = defineProps({
  provider: { type: String, required: true }, // e.g. 'google', 'github', 'apple'
  label: { type: String, required: true },
  icon: { type: String, default: "" },
  color: { type: String, default: "primary" },
  disabled: { type: Boolean, default: false },
  next: { type: String, default: "/chat" }, // allow override if needed
});

const db = useDb();
const loading = ref(false);
const brandColors = {
  google: "#C73A2E",
  facebook: "#1388CC",
  github: "#2E8B57",
  discord: "#5B6FD8",
  email: "#2AA79C",
};
const resolvedColor = computed(
  () => brandColors[props.provider] || props.color || "primary"
);

async function handleOAuth() {
  try {
    loading.value = true;
    await db.signInWithOAuth(props.provider, props.next);
    // redirects away; no further code runs after navigation
  } catch (e) {
    console.error("[OAuth Button] signInWithOAuth failed:", e);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.oauth-btn {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
  color: #ffffff !important;
}

.oauth-btn--google {
  background-color: #c73a2e !important;
}

.oauth-btn--facebook {
  background-color: #1388cc !important;
}

.oauth-btn--github {
  background-color: #2e8b57 !important;
}

.oauth-btn--discord {
  background-color: #5b6fd8 !important;
}

.oauth-btn--email {
  background-color: #2aa79c !important;
}

.oauth-btn:deep(.v-icon) {
  color: #ffffff !important;
}

.oauth-btn.v-btn--disabled {
  opacity: 0.72 !important;
  color: #ffffff !important;
}

.oauth-btn--google.v-btn--disabled {
  background-color: #c73a2e !important;
}

.oauth-btn--facebook.v-btn--disabled {
  background-color: #1388cc !important;
}

.oauth-btn--github.v-btn--disabled {
  background-color: #2e8b57 !important;
}

.oauth-btn--discord.v-btn--disabled {
  background-color: #5b6fd8 !important;
}

.oauth-btn--email.v-btn--disabled {
  background-color: #2aa79c !important;
}
</style>
