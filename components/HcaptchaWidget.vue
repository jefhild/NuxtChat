<template>
  <div class="hcaptcha-widget">
    <div ref="container"></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from "vue";

const props = defineProps({
  siteKey: { type: String, required: true },
  theme: { type: String, default: "light" },
  size: { type: String, default: "normal" },
});

const emit = defineEmits(["verified", "expired", "error"]);

const container = ref(null);
const widgetId = ref(null);

function loadHcaptcha() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-dom"));
  if (window.hcaptcha) return Promise.resolve(window.hcaptcha);
  if (window.__hcaptchaLoader) return window.__hcaptchaLoader;
  window.__hcaptchaLoader = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://js.hcaptcha.com/1/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.hcaptcha);
    script.onerror = () => reject(new Error("hcaptcha-load-failed"));
    document.head.appendChild(script);
  });
  return window.__hcaptchaLoader;
}

onMounted(async () => {
  if (!props.siteKey) return;
  try {
    const hcaptcha = await loadHcaptcha();
    if (!container.value || !hcaptcha?.render) return;
    widgetId.value = hcaptcha.render(container.value, {
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
    const hcaptcha = window.hcaptcha;
    if (hcaptcha && widgetId.value != null) {
      hcaptcha.remove(widgetId.value);
    }
  } catch {
    /* noop */
  }
});
</script>
