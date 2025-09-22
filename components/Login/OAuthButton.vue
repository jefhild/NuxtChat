<template>
  <v-btn
    :color="color"
    :prepend-icon="icon"
    :loading="loading"
    :disabled="loading"
    block
    class="mb-2"
    @click="handleOAuth"
  >
    Sign in with {{ label }}
  </v-btn>
</template>

<script setup>
import { ref } from "vue";
import { useDb } from "@/composables/useDB";

const props = defineProps({
  provider: { type: String, required: true }, // e.g. 'google', 'github', 'apple'
  label: { type: String, required: true },
  icon: { type: String, default: "" },
  color: { type: String, default: "primary" },
  next:  { type: String, default: "/chat" }, // allow override if needed
});

const db = useDb();
const loading = ref(false);

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