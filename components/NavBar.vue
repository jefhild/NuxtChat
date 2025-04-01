<template>
  <v-app-bar scroll-behavior="hide" scroll-threshold="61" image="/images/bkg/tiediebkg.webp" v-if="isAuthenticated">

    <!--<InactivityChecker /> -->

    <v-app-bar-title class="siteTitle">
      <NuxtLink to="/">imchatty</NuxtLink>
    </v-app-bar-title>

    <template v-slot:append>
      <OnlineStatus v-if="navProfileUserId"  />
      <v-btn prepend-icon="mdi-chat" to="/chat">Chat</v-btn>
      <v-btn prepend-icon="mdi-cog" to="/settings">Settings</v-btn>
      <v-btn @click="showLogoutDialog">Logout</v-btn>
    </template>
  </v-app-bar>

  <v-app-bar image="/images/bkg/tiediebkg.webp" v-else>
    <v-app-bar-title class="siteTitle">
      <NuxtLink to="/">imchatty</NuxtLink>
    </v-app-bar-title>
    <v-spacer></v-spacer>
    <v-btn @click="navigate('/signin')">Sign in</v-btn>
    <v-btn @click="navigate('/about')">About Us</v-btn>
    <v-btn @click="navigate('/freechat')">Free Chat</v-btn>
  </v-app-bar>

  <v-dialog v-model="logoutDialog" width="auto">
    <v-card max-width="400" prepend-icon="mdi-account-remove" title="Logout Of My Account">
      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center">Are you sure you want to logout?</v-col></v-row>
      </v-card-text>

      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmLogout">Confirm Logout</v-btn>

        <v-spacer></v-spacer>
        <v-btn class="ms-auto" text="Cancel" @click="logoutDialog = false"></v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";

const router = useRouter();
const authStore = useAuthStore();
const logoutDialog = ref(false);
const isAuthenticated = computed(() => !!authStore.user);

// Computed property for the profile name in the navbar
// const navProfileName = computed(() => authStore.userProfile?.displayname || "");
const navProfileUserId = computed(() => authStore.userProfile?.user_id);

function navigate(path) {
  window.scrollTo({ top: 0, behavior: "smooth" });
  router.push(path)
}

// Function to show the logout confirmation dialog
const showLogoutDialog = () =>
{
  logoutDialog.value = true;
};

// Function to handle logout confirmation
const confirmLogout = async () =>
{
  logoutDialog.value = false;
  router.push("/logout"); // Redirect to the logout page
};
</script>

<style scoped>
.siteTitle {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.5rem;
  font-weight: 700;
}
</style>