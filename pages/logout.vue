<template>
  <v-container fluid class="pa-0">
    <HomeRow1 />
    <LogoutHome />
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "vue-i18n";
const { t } = useI18n();

const authStore = useAuthStore();

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/logout",
    },
  ],
}));

const seoTitle = computed(() => t("pages.logout.meta.title"));
const seoDescription = computed(() => t("pages.logout.meta.description"));
const ogTitle = computed(() => t("pages.logout.meta.ogTitle"));
const ogUrl = computed(() => t("pages.logout.meta.ogUrl"));
const ogType = computed(() => t("pages.logout.meta.ogType"));
const ogImage = computed(() => t("pages.logout.meta.ogImage"));
const ogDescription = computed(() =>
  t("pages.logout.meta.ogDescription")
);
const twitterTitle = computed(() => t("pages.logout.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.logout.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.logout.meta.twitterDescription")
);

useSeoMeta({
  title: seoTitle.value,
  description: seoDescription.value,
  ogTitle: ogTitle.value,
  ogType: ogType.value,
  ogUrl: ogUrl.value,
  ogImage: ogImage.value,
  ogDescription: ogDescription.value,
  twitterCard: twitterCard.value,
  twitterTitle: twitterTitle.value,
  twitterDescription: twitterDescription.value,
});

onMounted(async () => {
  // console.log("logout");
  await authStore.logout();
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
