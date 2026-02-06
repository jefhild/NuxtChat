<template>
  <div class="turnstile-widget">
    <div ref="container"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  siteKey: { type: String, required: true },
  theme: { type: String, default: "auto" },
  size: { type: String, default: "normal" },
});

const emit = defineEmits(["verified", "expired", "error"]);

const container = ref(null);
const widgetId = ref(null);

function loadTurnstile() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-dom"));
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (window.__turnstileLoader) return window.__turnstileLoader;
  window.__turnstileLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.turnstile);
    script.onerror = () => reject(new Error("turnstile-load-failed"));
    document.head.appendChild(script);
  });
  return window.__turnstileLoader;
}

onMounted(async () => {
  if (!props.siteKey) return;
  try {
    const turnstile = await loadTurnstile();
    if (!container.value || !turnstile?.render) return;
    widgetId.value = turnstile.render(container.value, {
      sitekey: props.siteKey,
      theme: props.theme,
      size: props.size,
      callback: (token) => emit("verified", token),
      "expired-callback": () => emit("expired"),
      "error-callback": () => emit("error"),
    });
  } catch (err) {
    emit("error", err);
  }
});

onBeforeUnmount(() => {
  try {
    const turnstile = window.turnstile;
    if (turnstile && widgetId.value != null) {
      turnstile.remove(widgetId.value);
    }
  } catch {
    /* noop */
  }
});
</script>
