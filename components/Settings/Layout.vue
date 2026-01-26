<template>
  <v-container fluid class="settings-shell">
    <v-navigation-drawer
      v-model="drawer"
      temporary
      location="left"
      width="280"
      class="settings-drawer"
      :style="drawerStyle"
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
        <v-card class="border-0 elevation-0">
          <v-tabs-window v-model="tab" v-if="!isLoading">
            <v-tabs-window-item :value="1">
              <v-row align="start">
                <v-col class="settings-content-col">
                  <template v-if="userProfile">
                    <SettingsProfileForm
                      :userProfile="userProfile"
                      @openPhotoLibrary="selectTab(5)"
                    />
                  </template>
                  <template v-else>
                    <p>{{ $t("components.settings-container.loading") }}</p>
                  </template>
                </v-col>
              </v-row>
            </v-tabs-window-item>
            <v-tabs-window-item :value="2">
              <v-row align="start">
                <v-col class="settings-content-col">
                  <v-row>
                    <v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis">
                      {{ $t("components.settings-container.registered-only") }}
                    </v-col>
                  </v-row>
                  <!-- <template v-if="user?.id">
                    <SettingsFavorites :userId="user.id" />
                  </template> -->

                  <template v-if="userProfile?.user_id">
                    <SettingsFavorites :userId="userProfile.user_id" />
                  </template>
                </v-col>
              </v-row>
            </v-tabs-window-item>
            <v-tabs-window-item :value="3">
              <v-row align="start">
                <v-col class="settings-content-col">
                  <template v-if="user?.id">
                    <!-- <SettingsBlockedUsers :userId="user.id" /> -->
                    <SettingsBlockedUsers :userId="userProfile.user_id" />
                  </template>
                  <template v-else>
                    <p>{{ $t("components.settings-container.loading") }}</p>
                  </template>
                </v-col>
              </v-row>
            </v-tabs-window-item>
            <v-tabs-window-item :value="4">
              <v-row align="start">
                <v-col class="settings-content-col">
                  <!-- <v-row>
                    <v-col class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
                      >Registered Users Only</v-col
                    >
                  </v-row> -->
                  <template v-if="user?.id">
                    <!-- <SettingsUpvotes :userId="user.id" /> -->
                    <SettingsUpvotes :userId="userProfile.user_id" />
                  </template>
                  <template v-else>
                    <p>{{ $t("components.settings-container.loading") }}</p>
                  </template>
                </v-col>
              </v-row>
            </v-tabs-window-item>
            <v-tabs-window-item :value="5">
              <v-row align="start">
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
            </v-tabs-window-item>
          </v-tabs-window>
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

const drawerStyle = computed(() => ({
  top: "var(--nav2-offset, 0px)",
  height: "calc(100vh - var(--nav2-offset, 0px))",
}));

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

:global(.settings-drawer .v-overlay__content),
:global(.settings-drawer .v-navigation-drawer) {
  top: var(--nav2-offset, 0px) !important;
  height: calc(100vh - var(--nav2-offset, 0px)) !important;
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
  background-color: rgba(63, 81, 181, 0.1);
}

:global(.settings-drawer .v-list-item:hover) {
  background-color: rgba(63, 81, 181, 0.5) !important;
  transition: background-color 0.2s ease;
}
</style>
