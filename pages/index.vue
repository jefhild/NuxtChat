<template>
  <v-container
    v-if="isLoading"
    class="d-flex align-center justify-center fill-height"
  >
    <v-progress-circular indeterminate color="primary" size="50" />
  </v-container>

  <template v-else>
    <v-container fluid v-if="!isAuthenticated">
      <HomeRow1 />
      <v-row justify="center" class="mt-4">
        <v-col cols="auto"><LoginAi :titleText="titleText" /></v-col>
      </v-row>
    </v-container>

    <v-container fluid v-else>
      <HomeRow1 />
      <v-container class="text-center mt-6">
        <h1 class="green--text-h1">You're logged in as {{ loggedInUser }}</h1>
        <v-row class="mt-4" justify="center">
          <v-btn to="/chat" class="mx-2"
            >Chat <v-icon right>mdi-arrow-right</v-icon></v-btn
          >
          <v-btn to="/settings" class="mx-2"
            >Settings <v-icon right>mdi-arrow-right</v-icon></v-btn
          >
          <v-btn @click="showLogoutDialog" class="mx-2"
            >Logout <v-icon right>mdi-arrow-right</v-icon></v-btn
          >
        </v-row>
      </v-container>
    </v-container>
  </template>

  <v-dialog v-model="logoutDialog" width="auto">
    <v-card
      max-width="400"
      prepend-icon="mdi-account-remove"
      title="Logout Of My Account"
    >
      <v-card-text>Are you sure you want to logout?</v-card-text>
      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmLogout"
          >Confirm Logout</v-btn
        >
        <v-spacer />
        <v-btn text @click="logoutDialog = false">Cancel</v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore";
import { useDb } from "@/composables/useDB";

// SSR-safe head meta
useSeoMeta({
  title: "Free Anonymous Chat (Real or AI)",
  description: "Explore real & AI chat profiles on imchatty.com",
  ogTitle: "Real & AI Chat Profiles",
  twitterTitle: "Popular Free Chat",
  twitterCard: "summary_large_image",
});

// Reactive state
const isLoading = ref(true);
const isAuthenticated = ref(false);
const loggedInUser = ref("??");
const titleText = ref("Create Your Anonymous Profile");
const logoutDialog = ref(false);

// App logic
const router = useRouter();
const authStore = useAuthStore();
const { getUserProfileFromId } = useDb();

interface AuthUser {
  id?: string;
}
interface UserProfile {
  displayname?: string;
}

onMounted(async () => {
  try {
    await authStore.checkAuth();

    const user = authStore.user as unknown as AuthUser;
    const profile = authStore.userProfile as unknown as UserProfile;

    if (user?.id) {
      const { data: userProfileData } = await getUserProfileFromId(user.id);
      isAuthenticated.value = !!userProfileData;
      loggedInUser.value = profile?.displayname || "??";

      if (!userProfileData) {
        titleText.value = "Let's finish creating your profile";
      }
    } else {
      isAuthenticated.value = false;
    }
  } catch (err) {
    console.error("index.vue auth error:", err);
    isAuthenticated.value = false;
  } finally {
    isLoading.value = false;
  }
});

// Logout
function showLogoutDialog() {
  logoutDialog.value = true;
}
async function confirmLogout() {
  logoutDialog.value = false;
  router.push("/logout");
}
</script>

<style scoped>
.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}
</style>
