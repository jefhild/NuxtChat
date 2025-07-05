<template>
  <v-row class="rowbg rowheight" justify="center" align="center">
    <v-col class="text-center" v-if="isAuthenticated">
      <OnlineUsersCount />
    </v-col>
    <v-col class="text-center" v-else>
      {{ $t("pages.home.homeRow1.offlineUsersOnline") }}
    </v-col>

    <v-col class="fill-height d-none d-md-flex">
      <div class="fill-height d-flex align-center justify-center">
        <!-- <AdSenseAdBanner ad-slot="2131952668" /> -->
        Should we put an ad here?
      </div>
    </v-col>
    <v-col class="text-center">{{
      $t("pages.home.homeRow1.freeAnonymousChat")
    }}</v-col>
  </v-row>
</template>

<script lang="ts" setup>
import { useAuthStore } from "@/stores/authStore";

const authStore = useAuthStore();
const logoutDialog = ref(false);
const isAuthenticated = computed(() => !!authStore.user);
</script>

<style>
.rowbg {
  background-color: #fdfaf6;
}
.rowheight {
  height: 80px;
}
.fill-height {
  height: 100%;
}
.colstyle {
  font-family: "poppins", sans-serif;
  font-size: 1rem;
  font-weight: 400;
}
</style>
