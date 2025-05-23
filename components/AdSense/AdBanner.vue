<template>
  <div class="my-4 text-center">
    <ins
      class="adsbygoogle"
      style="display: block"
      :data-ad-client="adsenseClient"
      :data-ad-slot="adSlot"
      data-ad-format="auto"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>

<script lang="ts">
// Fix for TypeScript not recognizing `window.adsbygoogle`
declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}
</script>

<script setup lang="ts">
import { onMounted } from "vue";

const props = defineProps<{
  adSlot: string;
}>();

const config = useRuntimeConfig();
const adsenseClient = config.public.ADSENSE_CLIENT;

onMounted(() => {
  if (typeof window !== "undefined" && window.adsbygoogle) {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.error("Adsbygoogle push failed:", e);
    }
  }
});
</script>
