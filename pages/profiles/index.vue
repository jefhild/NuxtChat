<template>
  <v-container fluid>
    <HomeRow1 />
    <v-row>
      <v-col cols="12">
        <!-- Page Title -->
        <div class="d-flex justify-center mt-4">
          <h1>{{ $t("pages.profiles.index.title") }}</h1>
        </div>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <NewsContainer />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
const isAuthenticated = ref(false);
const authStore = useAuthStore();

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/profiles",
    },
  ],
}));

const seoTitle = computed(() => t("pages.profiles.index.meta.title"));
const seoDescription = computed(() => t("pages.profiles.index.meta.description"));
const ogTitle = computed(() => t("pages.profiles.index.meta.ogTitle"));
const ogType = computed(() => t("pages.profiles.index.meta.ogType"));
const ogUrl = computed(() => t("pages.profiles.index.meta.ogUrl"));
const ogDescription = computed(() =>
  t("pages.profiles.index.meta.ogDescription")
);
const ogImage = computed(() => t("pages.profiles.index.meta.ogImage"));
const twitterTitle = computed(() => t("pages.profiles.index.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.profiles.index.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.profiles.index.meta.twitterDescription")
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
  await authStore.checkAuth();
  isAuthenticated.value = authStore.user !== null;
});
</script>
