<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
    <!-- <HomeRow1 /> -->
    <SettingsLayout />
  </div>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
const authStore = useAuthStore();

// defineRouteRules({ prerender: false })

const router = useRouter();
const localPath = useLocalePath();

const isReady = computed(() =>
  ["authenticated", "anon_authenticated"].includes(authStore.authStatus)
);

onMounted(async () => {
  // console.log("[settings] onMounted: checking auth...");
  await authStore.checkAuth();

  // Check against valid statuses
  if (
    authStore.authStatus !== "authenticated" &&
    authStore.authStatus !== "anon_authenticated"
  ) {
    console.warn(`[settings] Invalid authStatus: ${authStore.authStatus}`);
    router.push(localPath("/"));
    return;
  }

});
</script>
