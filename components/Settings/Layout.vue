<template>
  <v-container>
    <v-row>
      <v-col>
        <v-card class="border-0 elevation-0">
          <v-tabs
            v-model="tab"
            align-tabs="center"
            color="deep-purple-accent-4"
            class="mb-6"
          >
            <v-tab :value="1">{{
              $t("components.settings-container.profile")
            }}</v-tab>
            <v-tab :value="2">{{
              $t("components.settings-container.favorites")
            }}</v-tab>
            <v-tab :value="3">{{
              $t("components.settings-container.blocked")
            }}</v-tab>
            <v-tab :value="4">{{
              $t("components.settings-container.upvotes")
            }}</v-tab>
          </v-tabs>
          <v-tabs-window v-model="tab" v-if="!isLoading">
            <v-tabs-window-item :value="1">
              <template v-if="userProfile">
                <SettingsProfileForm :userProfile="userProfile" />
              </template>
              <template v-else>
                <p>{{ $t("components.settings-container.loading") }}</p>
              </template>
            </v-tabs-window-item>
            <v-tabs-window-item :value="2">
              <v-row
                ><v-col
                  class="ml-3 mt-3 text-subtitle-2 text-medium-emphasis"
                  >{{
                    $t("components.settings-container.registered-only")
                  }}</v-col
                ></v-row
              >
              <!-- <template v-if="user?.id">
                <SettingsFavorites :userId="user.id" />
              </template> -->

              <template v-if="userProfile?.user_id">
                <SettingsFavorites :userId="userProfile.user_id" />
              </template>
            </v-tabs-window-item>
            <v-tabs-window-item :value="3">
              <template v-if="user?.id">
                <!-- <SettingsBlockedUsers :userId="user.id" /> -->
                 <SettingsBlockedUsers :userId="userProfile.user_id" />
              </template>
              <template v-else>
                <p>{{ $t("components.settings-container.loading") }}</p>
              </template>
            </v-tabs-window-item>
            <v-tabs-window-item :value="4">
              <!-- <v-row
                >
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
import { ref, onMounted } from "vue";
import { useAuthStore } from "@/stores/authStore1";

const tab = ref(1);
const authStore = useAuthStore();
const user = computed(() => authStore.user);
const userProfile = computed(() => authStore.userProfile);

const isLoading = ref(true);

onMounted(async () => {
  // await authStore.checkAuth();
  // user.value = authStore.user;
  isLoading.value = false;
});
</script>

<style></style>
