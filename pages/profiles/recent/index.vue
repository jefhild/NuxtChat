<template>
  <v-container fluid>
    <!-- Back Button -->
    <v-row>
      <v-col cols="12">
        <!-- Page Title -->
        <div class="d-flex justify-center mt-4">
          <v-btn icon @click="$router.back()" color="primary" class="mr-4">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h1>{{ $t("pages.profiles.recent.title") }}</h1>
        </div>
      </v-col>
    </v-row>

    <!-- Content -->
    <HomeRecent :limit="100" />
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const isAuthenticated = ref(false);
const authStore = useAuthStore();
const isLoading = ref(false);

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles/recent",
    },
  ],
}));

const seoTitle = computed(() => t("pages.profiles.recent.meta.title"));
const seoDescription = computed(() => t("pages.profiles.recent.meta.description"));
const ogTitle = computed(() => t("pages.profiles.recent.meta.ogTitle"));
const ogType = computed(() => t("pages.profiles.recent.meta.ogType"));
const ogUrl = computed(() => t("pages.profiles.recent.meta.ogUrl"));
const ogDescription = computed(() =>
  t("pages.profiles.recent.meta.ogDescription")
);
const ogImage = computed(() => t("pages.profiles.recent.meta.ogImage"));
const twitterTitle = computed(() => t("pages.profiles.recent.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.profiles.recent.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.profiles.recent.meta.twitterDescription")
);

useSeoMeta({
  title: seoTitle.value,
  description: seoDescription.value,
  ogTitle: ogTitle.value,
  ogType: ogType.value,
  ogUrl: ogUrl.value,
  ogDescription: ogDescription.value,
  ogImage: ogImage.value,
  twitterCard: twitterCard.value,
  twitterTitle: twitterTitle.value,
  twitterDescription: twitterDescription.value,
});

onMounted(async () => {
  isLoading.value = true;
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
  isLoading.value = false;
});
</script>

<style scoped>
.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.imchattyLogo {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
  color: rgb(80, 51, 90);
}
</style>
