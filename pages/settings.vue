<template>
  <v-container v-if="!isLoading" fluid>
    <!-- <HomeRow1 /> -->

    <PageHeader
      :text="$t('pages.settings.heading')"
      :subtitle="$t('pages.settings.subtitle')"
    />

    <SettingsLayout />
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
const authStore = useAuthStore();

// defineRouteRules({ prerender: false })

const router = useRouter();
const localPath = useLocalePath();

const isLoading = ref(true);

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

  isLoading.value = false;
});
</script>
