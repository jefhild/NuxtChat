<template>
  <!-- Loading Spinner -->
  <v-container v-if="isLoading" class="d-flex align-center justify-center fill-height">
    <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
  </v-container>

  <!-- Sign-in screen -->
  <v-container fluid v-else-if="!isAuthenticated" class="d-flex flex-column align-center justify-center fill-height">
    <div class="w-100">
      <HomeRow1 />
    </div>
    <v-row justify="center" align="center">
      <v-col cols="auto">
        <HomeMain />
      </v-col>
    </v-row>
  </v-container>

  <!-- Redirect fallback (shouldn't be seen, but just in case) -->
  <v-container v-else>
    <div>h{{ $t("pages.signin.note") }}</div>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const router = useRouter();
// Track the current step
const authStore = useAuthStore();
const isAuthenticated = ref(false);
const isLoading = ref(false);
const localPath = useLocalePath();
isLoading.value = true; // Set loading to true initially

onMounted(async () =>
{
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  isLoading.value = false;

  if (isAuthenticated.value)
  {
    router.push(localPath("/"));
    return;
  }
});

const seoTitle = computed(() => t("pages.signin.meta.title"));
const seoDescription = computed(() => t("pages.signin.meta.description"));
const ogTitle = computed(() => t("pages.signin.meta.ogTitle"));
const ogImage = computed(() => t("pages.signin.meta.ogImage"));
const ogDescription = computed(() =>
  t("pages.signin.meta.ogDescription")
);
const twitterTitle = computed(() => t("pages.signin.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.signin.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.signin.meta.twitterDescription")
);
const twitterImage = computed(() => t("pages.signin.meta.twitterImage"));

useSeoMeta({
  title: seoTitle.value,
  description: seoDescription.value,
  ogTitle: ogTitle.value,
  ogImage: ogImage.value,
  ogDescription: ogDescription.value,
  twitterCard: twitterCard.value,
  twitterTitle: twitterTitle.value,
  twitterDescription: twitterDescription.value,
  twitterImage: twitterImage.value,
});
</script>
