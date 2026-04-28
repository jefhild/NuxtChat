<template>
  <section class="admin-shell mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
    <Teleport to="body">
      <Transition name="admin-drawer-fade">
        <div
          v-if="drawer"
          class="admin-drawer-overlay"
          aria-hidden="true"
        >
          <button
            type="button"
            class="admin-drawer-scrim"
            aria-label="Close admin menu"
            @click="drawer = false"
          />
          <aside
            class="admin-drawer"
            aria-label="Admin navigation"
          >
            <div class="admin-drawer-list">
              <button
                v-for="(item, i) in items"
                :key="i"
                type="button"
                class="admin-drawer-item"
                :class="{ 'admin-drawer-item--active': selectedSection === item.value }"
                @click="
                  selectedSection = item.value;
                  drawer = false;
                "
              >
                <i :class="['mdi', item.icon, 'admin-drawer-item__icon']" aria-hidden="true" />
                <span>{{ item.text }}</span>
              </button>
            </div>
          </aside>
        </div>
      </Transition>
    </Teleport>

    <div class="admin-header-shell">
      <div class="admin-header-actions">
        <button
          type="button"
          class="admin-menu-btn"
          aria-label="Open admin menu"
          :aria-expanded="drawer ? 'true' : 'false'"
          @click="drawer = true"
        >
          <i class="mdi mdi-menu" aria-hidden="true" />
        </button>
      </div>
      <PageHeader :text="`Admin ${currentSectionLabel}`" />
    </div>

    <div class="admin-content-shell">
      <component :is="getSectionComponent(selectedSection)" />
    </div>
  </section>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import AdminDashboard from "~/components/Admin2/Dashboard.vue";
import AdminReports from "~/components/Admin2/Reports.vue";
import AdminAiBots from "~/components/Admin2/AiBots.vue";
import AdminFaqs from "~/components/Admin2/Faqs.vue";
import AdminProfileAvatars from "~/components/Admin2/ProfileAvatars.vue";
import AdminProfilePhotos from "~/components/Admin2/ProfilePhotos.vue";
import AdminMoodFeedAdmin from "~/components/Admin2/MoodFeedAdmin.vue";
import AdminSeoPages from "~/components/Admin2/SeoPages.vue";
import AdminSeoIntelligence from "~/components/Admin2/SeoIntelligence.vue";
import AdminAboutContent from "~/components/Admin2/AboutContent.vue";
import AdminWeeklyDigest from "~/components/Admin2/WeeklyDigest.vue";
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
    text: "SEO Pages",
    icon: "mdi-file-search-outline",
    value: "seoPages",
  },
  {
    text: "SEO Intelligence",
    icon: "mdi-chart-line",
    value: "seoIntelligence",
  },
  {
    text: "About Content",
    icon: "mdi-card-text-outline",
    value: "aboutContent",
  },
  {
    text: "Weekly Digest",
    icon: "mdi-email-newsletter",
    value: "weeklyDigest",
  },
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
    case "seoPages":
      return AdminSeoPages;
    case "seoIntelligence":
      return AdminSeoIntelligence;
    case "aboutContent":
      return AdminAboutContent;
    case "weeklyDigest":
      return AdminWeeklyDigest;
    case "reports":
      return AdminReports;
    case "aiBots":
      return AdminAiBots;
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

.admin-content-shell {
  width: 100%;
}

.admin-header-shell {
  position: relative;
  margin-bottom: 8px;
  padding-top: 4px;
}

.admin-header-actions {
  position: absolute;
  top: -8px;
  left: -10px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 2;
}

.admin-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 46px;
  margin: 0;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(15, 23, 42, 0.38);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  color: #e2e8f0;
  box-shadow: 0 8px 18px rgba(2, 6, 23, 0.18);
  cursor: pointer;
}

.admin-menu-btn:hover,
.admin-menu-btn:focus-visible {
  background: rgba(15, 23, 42, 0.56);
}

.admin-menu-btn:focus-visible {
  outline: 2px solid rgb(var(--color-primary) / 0.45);
  outline-offset: 2px;
}

.admin-menu-btn .mdi {
  font-size: 1.5rem;
}

.admin-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 1900;
}

.admin-drawer-scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgba(2, 6, 23, 0.46);
  cursor: pointer;
}

.admin-drawer {
  position: absolute;
  top: var(--nav2-offset, 64px);
  left: 0;
  width: min(280px, calc(100vw - 24px));
  height: calc(100dvh - var(--nav2-offset, 64px));
  overflow: hidden;
  border-right: 1px solid rgba(148, 163, 184, 0.16);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(17, 24, 39, 0.98));
  box-shadow: 0 16px 36px rgba(2, 6, 23, 0.32);
}

.admin-drawer-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  height: 100%;
  overflow-y: auto;
  padding: 0.85rem 0.7rem 1rem;
}

.admin-drawer-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 44px;
  width: 100%;
  border: 0;
  border-radius: 14px;
  background: transparent;
  color: #e2e8f0;
  padding: 0.7rem 0.9rem;
  text-align: left;
  font-size: 0.95rem;
  cursor: pointer;
}

.admin-drawer-item:hover,
.admin-drawer-item:focus-visible {
  background: rgba(63, 81, 181, 0.18);
}

.admin-drawer-item:focus-visible {
  outline: 2px solid rgb(var(--color-primary) / 0.45);
  outline-offset: 2px;
}

.admin-drawer-item--active {
  background: rgba(63, 81, 181, 0.24);
  color: #fff;
}

.admin-drawer-item__icon {
  font-size: 1.15rem;
}

.admin-drawer-fade-enter-active,
.admin-drawer-fade-leave-active {
  transition: opacity 0.18s ease;
}

.admin-drawer-fade-enter-active .admin-drawer,
.admin-drawer-fade-leave-active .admin-drawer {
  transition: transform 0.22s ease;
}

.admin-drawer-fade-enter-from,
.admin-drawer-fade-leave-to {
  opacity: 0;
}

.admin-drawer-fade-enter-from .admin-drawer,
.admin-drawer-fade-leave-to .admin-drawer {
  transform: translateX(-14px);
}
</style>
