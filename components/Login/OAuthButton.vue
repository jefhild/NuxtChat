<template>
  <button
    type="button"
    :disabled="loading || disabled"
    class="oauth-btn"
    :class="`oauth-btn--${provider}`"
    @click="handleOAuth"
  >
    <span v-if="loading" class="oauth-btn__spinner" aria-hidden="true" />
    <i v-else-if="icon" :class="['mdi', icon, 'oauth-btn__icon']" aria-hidden="true" />
    Sign in with {{ label }}
  </button>
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  min-height: 48px;
  padding: 0.8rem 1rem;
  border: 0;
  border-radius: 14px;
  background: v-bind(resolvedColor);
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  transition: transform 160ms ease, opacity 160ms ease, box-shadow 160ms ease;
}

.oauth-btn:hover:not(:disabled),
.oauth-btn:focus-visible {
  transform: translateY(-1px);
  box-shadow: 0 14px 28px rgb(var(--color-shadow) / 0.16);
  outline: none;
}

.oauth-btn:disabled {
  opacity: 0.72;
  cursor: default;
}

.oauth-btn__icon {
  font-size: 1.15rem;
}

.oauth-btn__spinner {
  width: 1rem;
  height: 1rem;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: oauth-btn-spin 0.7s linear infinite;
}

@keyframes oauth-btn-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
