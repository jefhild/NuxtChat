<template>
  <v-container fluid>
    <!-- <HomeRow1 /> -->
    <SettingsLayout />
  </v-container>
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
