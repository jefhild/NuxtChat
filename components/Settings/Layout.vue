<template>
  <v-container fluid class="settings-shell">
    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
      width="280"
      class="settings-drawer"
    >
      <v-list density="compact" class="settings-drawer-list">
        <v-list-subheader>{{ settingsHeading }}</v-list-subheader>
        <v-list-item
          v-for="item in menuItems"
          :key="item.value"
          class="settings-drawer-item"
          :active="tab === item.value"
          color="primary"
          rounded="shaped"
          @click="selectTab(item.value)"
        >
          <template #prepend>
            <v-icon :icon="item.icon" />
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-navigation-drawer>

    <div class="settings-header-shell">
      <div class="settings-header-actions">
        <v-btn icon variant="text" class="settings-menu-btn" @click="drawer = true">
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader :text="pageTitle" :subtitle="settingsSubtitle" />
    </div>

    <v-row>
      <v-col cols="12">
        <v-card class="settings-panel-card border-0 elevation-0">
          <template v-if="!isLoading">
            <v-row v-if="tab === 1" align="start">
              <v-col class="settings-content-col">
                <template v-if="userProfile">
                  <SettingsProfileForm
                    :userProfile="userProfile"
                    @openPhotoLibrary="selectTab(6)"
                  />
                </template>
                <template v-else>
                  <p>{{ $t("components.settings-container.loading") }}</p>
                </template>
              </v-col>
            </v-row>

            <v-row v-else-if="tab === 2" align="start">
              <v-col class="settings-content-col">
                <v-row>
                  <v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis">
                    {{ $t("components.settings-container.registered-only") }}
                  </v-col>
                </v-row>
                <template v-if="userProfile?.user_id">
                  <SettingsFavorites :userId="userProfile.user_id" />
                </template>
              </v-col>
            </v-row>

            <v-row v-else-if="tab === 3" align="start">
              <v-col class="settings-content-col">
                <template v-if="user?.id">
                  <SettingsBlockedUsers :userId="userProfile.user_id" />
                </template>
                <template v-else>
                  <p>{{ $t("components.settings-container.loading") }}</p>
                </template>
              </v-col>
            </v-row>

            <v-row v-else-if="tab === 4" align="start">
              <v-col class="settings-content-col">
                <template v-if="user?.id">
                  <SettingsUpvotes :userId="userProfile.user_id" />
                </template>
                <template v-else>
                  <p>{{ $t("components.settings-container.loading") }}</p>
                </template>
              </v-col>
            </v-row>

            <v-row v-else-if="tab === 5" align="start">
              <v-col class="settings-content-col">
                <SettingsChatSettings />
              </v-col>
            </v-row>

            <v-row v-else-if="tab === 6" align="start">
              <v-col class="settings-content-col">
                <v-row v-if="!photoLibraryAvailable">
                  <v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis">
                    {{ $t("components.settings-container.registered-only") }}
                  </v-col>
                </v-row>
                <template v-else-if="userProfile?.user_id">
                  <SettingsPhotoLibrary :userId="userProfile.user_id" />
                </template>
                <template v-else>
                  <p>{{ $t("components.settings-container.loading") }}</p>
                </template>
              </v-col>
            </v-row>
          </template>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import PageHeader from "~/components/PageHeader.vue";

const { t } = useI18n();

const tab = ref(1);
const drawer = ref(false);
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const userProfile = computed(() => authStore.userProfile);

const isLoading = ref(true);

const photoLibraryAvailable = computed(
  () => authStore.authStatus === "authenticated"
);

const settingsHeading = computed(() => t("pages.settings.heading"));
const settingsSubtitle = computed(() => t("pages.settings.subtitle"));

const menuItems = computed(() => [
    {
      value: 1,
      label: t("components.settings-container.profile"),
      title: t("components.settings-container.menu.profile"),
      icon: "mdi-account",
    },
    {
      value: 2,
      label: t("components.settings-container.favorites"),
      title: t("components.settings-container.menu.favorites"),
      icon: "mdi-heart",
    },
    {
      value: 3,
      label: t("components.settings-container.blocked"),
      title: t("components.settings-container.menu.blocked"),
      icon: "mdi-block-helper",
    },
    {
      value: 4,
      label: t("components.settings-container.upvotes"),
      title: t("components.settings-container.menu.upvotes"),
      icon: "mdi-thumb-up",
    },
    {
      value: 5,
      label: t("components.settings-container.site-settings", "Site Settings"),
      title: t("components.settings-container.menu.site-settings", "Site Settings"),
      icon: "mdi-chat-outline",
    },
    {
      value: 6,
      label: t("components.settings-container.photo-library"),
      title: t("components.settings-container.menu.photo-library"),
      icon: "mdi-image-multiple",
    },
  ]);

const currentSectionLabel = computed(() => {
  const match = menuItems.value.find((item) => item.value === tab.value);
  return match?.label || t("components.settings-container.profile");
});

const pageTitle = computed(
  () => `${settingsHeading.value} ${currentSectionLabel.value}`
);

const selectTab = (value) => {
  tab.value = value;
  drawer.value = false;
};

onMounted(async () => {
  // await authStore.checkAuth();
  // user.value = authStore.user;
  isLoading.value = false;
});
</script>

<style scoped>
.settings-content-col {
  padding-left: 4px;
}

:global(.settings-shell) {
  padding-top: 6px;
  padding-left: 2px !important;
  padding-right: 2px !important;
  max-width: 1260px;
  margin: 0 auto;
  overflow-x: clip;
}

.settings-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.settings-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.settings-menu-btn {
  margin: 0;
}

:global(.settings-drawer) {
  margin-top: 64px;
  height: calc(100% - 64px);
  overflow: hidden;
  z-index: 1700 !important;
}

:global(.settings-drawer .v-navigation-drawer__content) {
  overflow-y: auto;
}

.settings-drawer-item {
  min-height: 36px;
}

.settings-drawer-item :deep(.v-list-item-title) {
  font-size: 0.9rem;
}

:global(.settings-drawer .v-list-item--active) {
  background-color: rgba(var(--v-theme-primary), 0.12);
}

:global(.settings-drawer .v-list-item:hover) {
  background-color: rgba(var(--v-theme-primary), 0.2) !important;
  transition: background-color 0.2s ease;
}

.settings-panel-card {
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 14px;
  overflow: hidden;
}

:global(.v-theme--dark) .settings-panel-card {
  background: #0f172a;
  border-color: rgba(148, 163, 184, 0.16);
}

:global(.settings-panel-card .v-field__overlay) {
  background: transparent !important;
}

:global(.v-theme--dark .settings-panel-card .v-field) {
  background-color: transparent;
}

/* Route-scoped hard clamp: prevent Vuetify grid/gutter layers from bleeding
   across the viewport and creating horizontal seam artifacts on /settings. */
:global(.settings-shell .v-row) {
  margin-left: 0 !important;
  margin-right: 0 !important;
}

:global(.settings-shell .v-col) {
  padding-left: 4px;
  padding-right: 4px;
}

:global(.settings-shell .v-card),
:global(.settings-shell .v-card-text),
:global(.settings-shell .v-sheet) {
  backdrop-filter: none !important;
}
</style>
