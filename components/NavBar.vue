<template>
  <nav>
    <v-app-bar
      scroll-behavior="hide"
      scroll-threshold="61"
      image="/images/bkg/tiediebkg.webp"
      alt="navbar background image"
      v-if="isAuthenticated"
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink to="/">imchatty</NuxtLink>
      </v-app-bar-title>

      <template v-slot:append>
        <v-row class="d-none d-md-flex" align="center">
          <OnlineStatus v-if="navProfileUserId" />
          <!-- <v-btn prepend-icon="mdi-post-outline" @click="navigate('/articles')" variant="text">Blog</v-btn> -->
          <NuxtLink to="/articles" class="v-btn text-button" exact>
            <v-icon start>mdi-post-outline</v-icon> Blog
          </NuxtLink>
          <!-- <v-btn
            prepend-icon="mdi-chat"
            @click="navigate('/chat')"
            variant="text"
            >Chat</v-btn
          > -->
          <NuxtLink to="/chat" class="v-btn text-button" exact>
            <v-icon start>mdi-chat</v-icon> Chat
          </NuxtLink>
          <!-- <v-btn
            prepend-icon="mdi-cog"
            @click="navigate('/settings')"
            variant="text"
            >Settings</v-btn
          > -->

          <NuxtLink to="/settings" class="v-btn text-button" exact>
            <v-icon start>mdi-cog</v-icon> Settings
          </NuxtLink>
          <NotificationDropdown />
          <v-btn @click="showLogoutDialog" variant="text">Logout</v-btn>
        </v-row>

        <!-- Mobile menu -->
        <div class="d-flex d-md-none">
          <NotificationDropdown />

          <v-menu>
            <template #activator="{ props }">
              <v-app-bar-nav-icon v-bind="props" />
            </template>
            <v-list>
              <!-- <v-list-item to="/articles" prepend-icon="mdi-post-outline">Blog</v-list-item> -->
              <v-list-item
                :to="{ path: '/articles' }"
                prepend-icon="mdi-post-outline"
                link
              >
                <v-list-item-title>Blog</v-list-item-title>
              </v-list-item>
              <v-list-item :to="{ path: '/chat' }" prepend-icon="mdi-chat" link>
                <v-list-item-title>Chat</v-list-item-title>
              </v-list-item>
              <!-- <v-list-item to="/chat" prepend-icon="mdi-chat">Chat</v-list-item> -->
              <v-list-item :to="{ path: '/settings' }" prepend-icon="mdi-cog"
                >Settings</v-list-item
              >
              <v-list-item @click="showLogoutDialog" prepend-icon="mdi-logout"
                >Logout</v-list-item
              >
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-app-bar>

    <v-app-bar
      image="/images/bkg/tiediebkg.webp"
      alt="navbar background image"
      v-else
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink to="/">imchatty</NuxtLink>
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <template v-slot:append>
        <v-row class="d-none d-md-flex" align="center">
          <!-- <v-btn prepend-icon="mdi-post-outline" to="/articles">Blog</v-btn> -->
          <NuxtLink to="/articles" class="v-btn text-button mr-3" exact>
            <v-icon start>mdi-post-outline</v-icon> Blog
          </NuxtLink>

          <!-- <v-btn @click="navigate('/signin')" prepend-icon="mdi-login"
            >Sign in</v-btn
          > -->

          <NuxtLink to="/signin" class="v-btn text-button mr-3" exact>
            <v-icon start>mdi-login</v-icon> Sign in
          </NuxtLink>

          <!-- <v-btn @click="navigate('/about')" prepend-icon="mdi-account-group"
            >About Us</v-btn
          > -->

          <NuxtLink to="/about" class="v-btn text-button mr-3" exact>
            <v-icon start>mdi-account-group</v-icon> About Us
          </NuxtLink>

          <!-- <v-btn
            @click="navigate('/profiles')"
            prepend-icon="mdi-monitor-account"
            >Free Chat</v-btn
          > -->
          <NuxtLink to="/profiles" class="v-btn text-button mr-3" exact>
            <v-icon start>mdi-monitor-account</v-icon> Free Chat
          </NuxtLink>
        </v-row>

        <!-- Mobile menu -->
        <div class="d-flex d-md-none">
          <v-menu>
            <template #activator="{ props }">
              <v-app-bar-nav-icon v-bind="props" />
            </template>

            <v-list>
              <v-list-item to="/articles" prepend-icon="mdi-post-outline"
                >Blog</v-list-item
              >
              <v-list-item to="/signin" prepend-icon="mdi-login"
                >Sign in</v-list-item
              >
              <v-list-item to="/about" prepend-icon="mdi-account-group"
                >About Us</v-list-item
              >
              <v-list-item to="/profiles" prepend-icon="mdi-monitor-account"
                >Free Chat</v-list-item
              >
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-app-bar>
  </nav>
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
  router.push(path);
}

// Function to show the logout confirmation dialog
const showLogoutDialog = () => {
  logoutDialog.value = true;
};

// Function to handle logout confirmation
const confirmLogout = async () => {
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
