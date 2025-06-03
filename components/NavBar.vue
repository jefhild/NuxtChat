<template>
  <nav aria-label="Main Navigation" v-if="isAuthenticated">
    <v-app-bar
      scroll-behavior="hide"
      scroll-threshold="61"
      image="/images/bkg/tiediebkg.webp"
      alt="navbar background image"
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink to="/">{{ $t("components.navbar.imchatty") }}</NuxtLink>
      </v-app-bar-title>

      <template v-slot:append>
        <v-row class="d-none d-md-flex" align="center">
          <OnlineStatus v-if="navProfileUserId" />
          <NuxtLink to="/articles" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-post-outline</v-icon>{{ $t("components.navbar.blog") }}
          </NuxtLink>
          <NuxtLink to="/chat" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-chat</v-icon>{{ $t("components.navbar.chat") }}
          </NuxtLink>
          <NuxtLink to="/settings" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-cog</v-icon>{{ $t("components.navbar.settings") }}
          </NuxtLink>
          <NotificationDropdown />
          <v-btn @click="showLogoutDialog" variant="text">{{ $t("components.navbar.logout") }}</v-btn>
        </v-row>

        <!-- Mobile menu -->
        <div class="d-flex d-md-none">
          <NotificationDropdown />

          <v-menu>
            <template #activator="{ props }">
              <v-app-bar-nav-icon v-bind="props" />
            </template>
            <v-list>
              <v-list-item
                :to="{ path: '/articles' }"
                prepend-icon="mdi-post-outline"
                link
              >
                <v-list-item-title>{{ $t("components.navbar.blog") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :to="{ path: '/chat' }" prepend-icon="mdi-chat" link>
                <v-list-item-title>{{ $t("components.navbar.chat") }}</v-list-item-title>
              </v-list-item>
              <!-- <v-list-item to="/chat" prepend-icon="mdi-chat">Chat</v-list-item> -->
              <v-list-item :to="{ path: '/settings' }" prepend-icon="mdi-cog"
                >{{ $t("components.navbar.settings") }}</v-list-item
              >
              <v-list-item @click="showLogoutDialog" prepend-icon="mdi-logout"
                >{{ $t("components.navbar.logout") }}</v-list-item
              >
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-app-bar>
  </nav>
  <nav v-else>
    <v-app-bar image="/images/bkg/tiediebkg.webp" alt="navbar background image">
      <v-app-bar-title class="siteTitle">
        <NuxtLink to="/">{{ $t("components.navbar.imchatty") }}</NuxtLink>
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <template v-slot:append>
        <v-row class="d-none d-md-flex" align="center">
          <NuxtLink to="/articles" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-post-outline</v-icon> {{ $t("components.navbar.blog") }}
          </NuxtLink>

          <NuxtLink to="/signin" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-login</v-icon> {{ $t("components.navbar.signin") }}
          </NuxtLink>

          <NuxtLink to="/about" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-account-group</v-icon> {{ $t("components.navbar.aboutus") }}
          </NuxtLink>

          <NuxtLink to="/profiles" class="v-btn text-button navItem mr-3" exact>
            <v-icon start>mdi-monitor-account</v-icon> {{ $t("components.navbar.free-chat") }}
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
                >{{ $t("components.navbar.blog") }}</v-list-item
              >
              <v-list-item to="/signin" prepend-icon="mdi-login"
                >{{ $t("components.navbar.signin") }}</v-list-item
              >
              <v-list-item to="/about" prepend-icon="mdi-account-group"
                >{{ $t("components.navbar.aboutus") }}</v-list-item
              >
              <v-list-item to="/profiles" prepend-icon="mdi-monitor-account"
                >{{ $t("components.navbar.free-chat") }}</v-list-item
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
            >{{ $t("pages.home.landing_page.logout_confirm") }}</v-col
          ></v-row
        >
      </v-card-text>

      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmLogout"
          >{{ $t("pages.home.landing_page.logout_confirm_button") }}</v-btn
        >

        <v-spacer></v-spacer>
        <v-btn
          class="ms-auto"
          @click="logoutDialog = false"
        >
        {{ $t("pages.home.landing_page.cancel") }}</v-btn>
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
const navProfileUserId = computed(() => authStore.userProfile?.user_id);

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

.navItem {
  color: black;
}
</style>
