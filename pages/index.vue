<template>
  <v-container
    v-if="isLoading"
    class="d-flex align-center justify-center fill-height"
  >
    <v-progress-circular indeterminate color="primary" size="50" />
  </v-container>

  <template v-else>
    <v-container
      fluid
      v-if="!isAuthenticated"
      class="d-flex flex-column align-center justify-center fill-height"
    >
      <div class="w-100">
        <HomeRow1 />
      </div>
      <v-row justify="center" align="center">
        <v-col cols="auto">
          <LoginAi :titleText="titleText" />
        </v-col>
      </v-row>
    </v-container>
    <v-container fluid v-else>
      <div class="w-100">
        <HomeRow1 />
      </div>
      <v-fade-transition mode="out-in">
        <v-container
          fluid
          class="d-flex align-center justify-center"
          style="min-height: 70vh"
        >
          <v-row>
            <v-col class="text-center d-flex flex-column align-center">
              <h1 class="green--text-h1">
                You're logged in as {{ loggedInUser }}
              </h1>
              <h2 class="text-h6">Where would you like to go?</h2>
              <v-row>
                <v-col>
                  <v-btn to="/chat" class="mt-4"
                    >Chat <v-icon right>mdi-arrow-right</v-icon></v-btn
                  >
                </v-col>
                <v-col>
                  <v-btn to="/settings" class="mt-4"
                    >Settings <v-icon right>mdi-arrow-right</v-icon></v-btn
                  >
                </v-col>
                <v-col>
                  <v-btn @click="showLogoutDialog" class="mt-4"
                    >Logout<v-icon right>mdi-arrow-right</v-icon></v-btn
                  >
                </v-col>
              </v-row>
            </v-col>
          </v-row>
        </v-container>
      </v-fade-transition>
    </v-container>
  </template>

  <v-dialog v-model="logoutDialog" width="auto">
    <v-card
      max-width="400"
      prepend-icon="mdi-account-remove"
      title="Logout Of My Account"
    >
      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center"
            >Are you sure you want to logout?</v-col
          ></v-row
        >
      </v-card-text>

      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmLogout"
          >Confirm Logout</v-btn
        >

        <v-spacer></v-spacer>
        <v-btn
          class="ms-auto"
          text="Cancel"
          @click="logoutDialog = false"
        ></v-btn>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from "vue";
import { useAuthStore } from "@/stores/authStore";

const {
  getUserProfileFromId,
  authGetUser,
  getInterests,
  getDescriptions,
  updateProfilePhoto,
} = useDb();
// Track the current step
const authStore = useAuthStore();
const router = useRouter();
const loggedInUser = ref(authStore.userProfile?.displayname || "??");
const isLoading = ref(false);
const isAuthenticated = ref(false);
const titleText = ref("Create Your Anonymous Profile");
const logoutDialog = ref(false);

// Initialize authentication status
onMounted(async () => {
  isLoading.value = true; // Set loading to true initially

  //If the user just clicked on change the email i redirect
  //him to /loginemail so his provider can be changed
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");

  if (code) {
    // Try to identify if this is an email change — use a heuristic
    const { data: user } = await authGetUser();

    // If logged in AND there's a code param → assume it's email change verification
    if (user?.user && user.user.email_confirmed_at) {
      router.push("/loginemail");
    }
  }

  await authStore.checkAuth();
  // console.log("User:", authStore.user); // Debug to see if the user is correctly fetched
  isAuthenticated.value = authStore.user !== null;

  //check if user.id is present in the profiles table, if not go create account
  const { data: userProfileData } = await getUserProfileFromId(
    authStore.user?.id || ""
  );

  if (!userProfileData && authStore.user?.id) {
    isAuthenticated.value = false; // User doesn't exist, set to false
    titleText.value = "Let's finish up creating your profile"; // Set title for new users
  }

  loggedInUser.value = authStore.userProfile?.displayname || "??";
  isLoading.value = false;
});

// Function to show the logout confirmation dialog
const showLogoutDialog = () => {
  logoutDialog.value = true;
};

// Function to handle logout confirmation
const confirmLogout = async () => {
  logoutDialog.value = false;
  router.push("/logout"); // Redirect to the logout page
};

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com",
    },
  ]
}));

useSeoMeta({
  title: "Free Anonymous Chat (Real or AI)",
  description:
    "Check out the most popular chat profiles on imchatty.com! Browse top-rated members with real profiles, personalized details, and genuine interests, or find your perfect AI chat today!",
  ogTitle: "Real & AI Chat Profiles",
  ogDescription:
    "Check out the most popular chat profiles on imchatty.com! Browse top-rated members with real profiles, personalized details, and genuine interests, or find your perfect AI chat today!",
  // ogImage: popularProfiles[0].value.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Free Chat",
  twitterDescription:
    "Check out the most popular chat profiles on imchatty.com! Browse top-rated members with real profiles, personalized details, and genuine interests, or find your perfect AI chat today!",
  // twitterImage: popularProfiles[0].value.avatar_url,
});
</script>

<style scoped>
.green--text-h1 {
  font-family: "poppins", sans-serif;
  font-size: 2rem;
  font-weight: 400;
  color: rgb(51, 90, 78);
}

.green--text-h2 {
  font-family: "poppins", sans-serif;
  font-size: 1.2rem;
  font-weight: 100;
  color: rgb(51, 90, 78);
}
</style>
