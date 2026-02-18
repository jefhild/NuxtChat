<template>
  <HomeMain
    v-if="['unauthenticated', 'guest', 'onboarding'].includes(auth.authStatus)"
  />

  <v-container
    v-else-if="auth.authStatus === 'anon_authenticated'"
    class="signin-link-shell"
  >
    <v-card class="pa-6" max-width="520">
      <v-card-title class="text-h6">
        {{ $t("components.profile-email-link.prompt") }}
      </v-card-title>
      <v-card-text class="text-body-2 text-medium-emphasis">
        {{ $t("components.profile-email-link.dialog-description") }}
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn color="primary" @click="goLinkEmail">
          {{ $t("components.profile-email-link.cta") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
const auth = useAuthStore();
const localePath = useLocalePath();

function goLinkEmail() {
  navigateTo({ path: localePath("/settings"), query: { linkEmail: "1" } });
}

useSeoI18nMeta("signin", {
  robots: "noindex,nofollow",
});
</script>

<style scoped>
.signin-link-shell {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
