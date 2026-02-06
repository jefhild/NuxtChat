<template>
  <v-container fluid class="admin-shell">
    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
      width="280"
      class="admin-drawer"
    >
      <v-list density="compact" class="admin-drawer-list">
        <v-list-item
          v-for="(item, i) in items"
          :key="i"
          :value="item.value"
          class="admin-drawer-item"
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

    <div class="admin-header-shell">
      <div class="admin-header-actions">
        <v-btn icon variant="text" class="admin-menu-btn" @click="drawer = true">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader :text="`Admin ${currentSectionLabel}`" />
    </div>

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
import AdminNewsSource from "~/components/Admin2/NewsSource.vue";
import AdminEngagementRules from "~/components/Admin2/EngagementRules.vue";
import AdminFaqs from "~/components/Admin2/Faqs.vue";
import AdminProfileAvatars from "~/components/Admin2/ProfileAvatars.vue";
import AdminProfilePhotos from "~/components/Admin2/ProfilePhotos.vue";
import AdminMoodFeedAdmin from "~/components/Admin2/MoodFeedAdmin.vue";
import PageHeader from "~/components/PageHeader.vue";
import { useAuthStore } from "@/stores/authStore1";

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
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
  {
    text: t("pages.admin.sections.profileAvatars"),
    icon: "mdi-account-box",
    value: "profileAvatars",
  },
  {
    text: t("pages.admin.sections.moodFeed"),
    icon: "mdi-comment-question-outline",
    value: "moodFeed",
  },
  {
    text: "Photo Library",
    icon: "mdi-image-multiple",
    value: "profilePhotos",
  },
]);

const sectionValues = computed(() =>
  items.value.map((item) => item.value).filter(Boolean)
);

const currentSectionLabel = computed(() => {
  const match = items.value.find((item) => item.value === selectedSection.value);
  return match?.text || "Dashboard";
});

const syncSectionFromRoute = () => {
  const section = String(route.query.section || "");
  if (sectionValues.value.includes(section)) {
    selectedSection.value = section;
  }
};

onMounted(async () => {
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin) {
    console.log("Unauthorized access to admin panel");
    router.push(localPath("/")); // or show unauthorized page
    return;
  }
  syncSectionFromRoute();
});

watch(
  () => route.query.section,
  () => syncSectionFromRoute()
);

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
    case "newsSource":
      return AdminNewsSource;
    case "engagementRules":
      return AdminEngagementRules;
    case "faqs":
      return AdminFaqs;
    case "profileAvatars":
      return AdminProfileAvatars;
    case "profilePhotos":
      return AdminProfilePhotos;
    case "moodFeed":
      return AdminMoodFeedAdmin;
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

.admin-shell {
  padding-top: 6px;
}

.admin-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.admin-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.admin-menu-btn {
  margin: 0;
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
  overflow: hidden;
}

.admin-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.admin-drawer-item {
  min-height: 36px;
}

.admin-drawer-item :deep(.v-list-item-title) {
  font-size: 0.9rem;
}
</style>
