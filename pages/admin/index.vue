<template>
  <v-container fluid>
    <!-- Top Bar -->
    <v-row justify="center" class="title-bar">
      <v-col cols="12" md="8">
        <h1 class="page-title">{{ $t("pages.admin.title") }}</h1>
      </v-col>
    </v-row>

    <v-row>
      <!-- Sidebar -->
      <v-col cols="12" md="3" class="sidebar">
        <v-card class="mx-auto pa-2" max-width="300">
          <v-list>
            <v-list-subheader>{{ $t("pages.admin.sections-title") }}</v-list-subheader>

            <v-list-item v-for="(item, i) in items" :key="i" :value="item.value" @click="selectedSection = item.value"
              :active="selectedSection === item.value" color="primary" rounded="shaped">
              <template v-slot:prepend>
                <v-icon :icon="item.icon"></v-icon>
              </template>
              <v-list-item-title>{{ item.text }}</v-list-item-title>
            </v-list-item>

          </v-list>
        </v-card>
      </v-col>

      <!-- Main Content -->
      <v-col cols="12" md="9">
        <component :is="getSectionComponent(selectedSection)" />
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
import AdminDashboard from '@/components/admin/dashboard.vue';
import AdminArticles from '@/components/admin/articles.vue';
import AdminCategories from '@/components/admin/categories.vue';
import AdminTags from '@/components/admin/tags.vue';
import AdminReports from '@/components/admin/reports.vue';

const { t } = useI18n();
const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();

const selectedSection = ref("dashboard");

const items = computed(() => [
  { text: t("pages.admin.sections.dashboard"), icon: 'mdi-view-dashboard', value: 'dashboard' },
  { text: t("pages.admin.sections.articles"), icon: 'mdi-post', value: 'articles' },
  { text: t("pages.admin.sections.categories"), icon: 'mdi-folder', value: 'categories' },
  { text: t("pages.admin.sections.tags"), icon: 'mdi-tag', value: 'tags' },
  { text: t("pages.admin.sections.reports"), icon: 'mdi-alert-octagon', value: 'reports' },
]);

onMounted(async () =>
{
  await authStore.checkAuth();
  if (!authStore.userProfile?.is_admin)
  {
    console.log("Unauthorized access to admin panel");
    router.push(localPath("/")); // or show unauthorized page
  }
});

const getSectionComponent = (section) =>
{
  switch (section)
  {
    case 'articles': return AdminArticles;
    case 'categories': return AdminCategories;
    case 'tags': return AdminTags;
    case 'reports': return AdminReports;
    default: return AdminDashboard;
  }
};
</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 10px;
  padding: 20px;
  background-image: url('/images/bkg/tiediebkg.webp');
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: black;
}

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

</style>
