<template>
  <v-container fluid>
    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
      width="280"
      class="admin-drawer"
    >
      <v-list>
        <v-list-subheader>{{ $t("pages.admin.sections-title") }}</v-list-subheader>

        <v-list-item
          v-for="(item, i) in items"
          :key="i"
          :value="item.value"
          @click="
            selectedSection = item.value;
            drawer = false;
          "
          :active="selectedSection === item.value"
          color="primary"
          rounded="shaped"
        >
          <template v-slot:prepend>
            <v-icon :icon="item.icon"></v-icon>
          </template>
          <v-list-item-title>{{ item.text }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-row class="mb-3">
      <v-col cols="12" class="d-flex align-center ga-3">
        <v-btn icon variant="text" @click="drawer = true">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
        <div class="text-subtitle-1 font-weight-medium">
          {{ $t("pages.admin.sections-title") }}
        </div>
      </v-col>
    </v-row>

    <v-row>
      <!-- Main Content -->
      <v-col cols="12">
        <component :is="getSectionComponent(selectedSection)" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import AdminDashboard from "~/components/Admin2/Dashboard.vue";
import AdminArticles from "~/components/Admin2/Articles1.vue";
import AdminCategories from "~/components/Admin2/Categories.vue";
import AdminTags from "~/components/Admin2/Tags.vue";
import AdminReports from "~/components/Admin2/Reports.vue";
import AdminAiBots from "~/components/Admin2/AiBots.vue";
import AdminNewsmesh from "~/components/Admin2/NewsmeshReview.vue";
import AdminNewsSource from "~/components/Admin2/NewsSource.vue";
import AdminEngagementRules from "~/components/Admin2/EngagementRules.vue";
import AdminFaqs from "~/components/Admin2/Faqs.vue";
import { useAuthStore } from "@/stores/authStore1";

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();

const selectedSection = ref("dashboard");
const drawer = ref(false);

const items = computed(() => [
  {
    text: t("pages.admin.sections.dashboard"),
    icon: "mdi-view-dashboard",
    value: "dashboard",
  },
  {
    text: t("pages.admin.sections.articles"),
    icon: "mdi-post",
    value: "articles",
  },
  {
    text: t("pages.admin.sections.newsmesh"),
    icon: "mdi-newspaper-variant",
    value: "newsmesh",
  },
  {
    text: t("pages.admin.sections.newsSource"),
    icon: "mdi-link-plus",
    value: "newsSource",
  },
  {
    text: t("pages.admin.sections.categories"),
    icon: "mdi-folder",
    value: "categories",
  },
  { text: t("pages.admin.sections.tags"), icon: "mdi-tag", value: "tags" },
  {
    text: t("pages.admin.sections.reports"),
    icon: "mdi-alert-octagon",
    value: "reports",
  },
  {
    text: t("pages.admin.sections.faqs"),
    icon: "mdi-help-circle-outline",
    value: "faqs",
  },
  {
    text: "Engagement Rules",
    icon: "mdi-shield-account",
    value: "engagementRules",
  },
  {
    text: t("pages.admin.sections.aiBots"),
    icon: "mdi-robot-happy-outline",
    value: "aiBots",
  },
]);

onMounted(async () => {
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin) {
    console.log("Unauthorized access to admin panel");
    router.push(localPath("/")); // or show unauthorized page
  }
});

const getSectionComponent = (section) => {
  switch (section) {
    case "articles":
      return AdminArticles;
    case "categories":
      return AdminCategories;
    case "tags":
      return AdminTags;
    case "reports":
      return AdminReports;
    case "aiBots":
      return AdminAiBots;
    case "newsmesh":
      return AdminNewsmesh;
    case "newsSource":
      return AdminNewsSource;
    case "engagementRules":
      return AdminEngagementRules;
    case "faqs":
      return AdminFaqs;
    default:
      return AdminDashboard;
  }
};
</script>

<style scoped>
.page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 2.8rem;
  text-align: center;
  margin: 2.5rem 0;
}

.v-list-item--active {
  background-color: rgba(63, 81, 181, 0.1);
  /* light blue highlight */
}

.v-list-item:hover {
  background-color: rgba(63, 81, 181, 0.5) !important;
  transition: background-color 0.2s ease;
}
  .admin-drawer {
    margin-top: 64px;
    height: calc(100% - 64px);
  }
</style>
