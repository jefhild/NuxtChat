<template>
  <v-container>
    <v-row>
      <v-col>
        <v-card class="border-0 elevation-0">
          <v-navigation-drawer
            v-model="drawer"
            temporary
            location="left"
            class="settings-drawer"
            :style="drawerStyle"
          >
            <v-list nav>
              <v-list-item
                v-for="item in menuItems"
                :key="item.value"
                :title="item.title"
                :active="tab === item.value"
                @click="selectTab(item.value)"
              />
            </v-list>
          </v-navigation-drawer>
          <v-tabs-window v-model="tab" v-if="!isLoading">
            <v-tabs-window-item :value="1">
              <v-row align="start">
                <v-col cols="auto" class="settings-menu-col">
                  <v-btn
                    icon="mdi-menu"
                    variant="text"
                    aria-label="Open settings menu"
                    @click="drawer = true"
                  />
                </v-col>
                <v-col class="settings-content-col">
                  <template v-if="userProfile">
                    <SettingsProfileForm :userProfile="userProfile" />
                  </template>
                  <template v-else>
                    <p>{{ $t("components.settings-container.loading") }}</p>
                  </template>
                </v-col>
              </v-row>
            </v-tabs-window-item>
            <v-tabs-window-item :value="2">
              <v-row align="start">
                <v-col cols="auto" class="settings-menu-col">
                  <v-btn
                    icon="mdi-menu"
                    variant="text"
                    aria-label="Open settings menu"
                    @click="drawer = true"
                  />
                </v-col>
                <v-col class="settings-content-col">
                  <v-row>
                    <v-col
                      class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
                    >
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
                <v-col cols="auto" class="settings-menu-col">
                  <v-btn
                    icon="mdi-menu"
                    variant="text"
                    aria-label="Open settings menu"
                    @click="drawer = true"
                  />
                </v-col>
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
                <v-col cols="auto" class="settings-menu-col">
                  <v-btn
                    icon="mdi-menu"
                    variant="text"
                    aria-label="Open settings menu"
                    @click="drawer = true"
                  />
                </v-col>
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
          </v-tabs-window>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
import { ref, onMounted, computed } from "vue";
import { useAuthStore } from "@/stores/authStore1";

const tab = ref(1);
const drawer = ref(false);
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const userProfile = computed(() => authStore.userProfile);

const isLoading = ref(true);

const menuItems = computed(() => [
  { value: 1, title: t("components.settings-container.profile") },
  { value: 2, title: t("components.settings-container.favorites") },
  { value: 3, title: t("components.settings-container.blocked") },
  { value: 4, title: t("components.settings-container.upvotes") },
]);

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
.settings-menu-col {
  padding-top: 8px;
}

.settings-content-col {
  padding-left: 4px;
}

:global(.settings-drawer) {
  z-index: 1700 !important;
}

:global(.settings-drawer .v-overlay__content),
:global(.settings-drawer .v-navigation-drawer) {
  top: var(--nav2-offset, 0px) !important;
  height: calc(100vh - var(--nav2-offset, 0px)) !important;
}
</style>
