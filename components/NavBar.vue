<template>
  <nav aria-label="Main Navigation" v-if="isAuthenticated">
    <v-app-bar
      scroll-behavior="hide"
      scroll-threshold="61"
      image="/images/bkg/tiediebkg.webp"
      alt="navbar background image"
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink :to="localPath('/')">{{
          $t("components.navbar.imchatty")
        }}</NuxtLink>
      </v-app-bar-title>

      <template v-slot:append>
        <nav role="navigation" aria-label="Main Navigation">
          <v-row class="d-none d-md-flex" align="center">
            <OnlineStatus v-if="navProfileUserId" />
            <NuxtLink
              :to="localPath('/articles')"
              class="v-btn text-button navItem mr-3"
              exact
            >
              <v-icon start>mdi-post-outline</v-icon
              >{{ $t("components.navbar.blog") }}
            </NuxtLink>
            <NuxtLink
              :to="localPath('/chat')"
              class="v-btn text-button navItem mr-3"
              exact
            >
              <v-icon start>mdi-chat</v-icon>{{ $t("components.navbar.chat") }}
            </NuxtLink>
            <NuxtLink
              :to="localPath('/settings')"
              class="v-btn text-button navItem mr-3"
              exact
            >
              <v-icon start>mdi-cog</v-icon
              >{{ $t("components.navbar.settings") }}
            </NuxtLink>
            <NotificationDropdown />
            <LanguageSwitcher class="ml-3" />
            <v-btn @click="showLogoutDialog" variant="text">{{
              $t("components.navbar.logout")
            }}</v-btn>
          </v-row>
        </nav>
        <!-- Mobile menu -->
        <div class="d-flex d-md-none">
          <NotificationDropdown />
          <LanguageSwitcher class="ml-3" />
          <v-menu>
            <template #activator="{ props }">
              <v-app-bar-nav-icon v-bind="props" />
            </template>
            <v-list>
              <v-list-item
                :to="localPath('/articles')"
                prepend-icon="mdi-post-outline"
                link
              >
                <v-list-item-title>{{
                  $t("components.navbar.blog")
                }}</v-list-item-title>
              </v-list-item>
              <v-list-item
                :to="localPath('/chat')"
                prepend-icon="mdi-chat"
                link
              >
                <v-list-item-title>{{
                  $t("components.navbar.chat")
                }}</v-list-item-title>
              </v-list-item>
              <!-- <v-list-item to="/chat" prepend-icon="mdi-chat">Chat</v-list-item> -->
              <v-list-item
                :to="localPath('/settings')"
                prepend-icon="mdi-cog"
                >{{ $t("components.navbar.settings") }}</v-list-item
              >
              <v-list-item
                @click="showLogoutDialog"
                prepend-icon="mdi-logout"
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
        <NuxtLink :to="localPath('/')">{{
          $t("components.navbar.imchatty")
        }}</NuxtLink>
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <template v-slot:append>
        <nav role="navigation" aria-label="Main Navigation">
          <v-row class="d-none d-md-flex" align="center">
            <NuxtLink
              :to="localPath('/articles')"
              class="v-btn text-button navItem mr-3"
              exact
            >
              <!-- <v-icon start>mdi-post-outline</v-icon> -->
              {{ $t("components.navbar.blog") }}
            </NuxtLink>

            <NuxtLink
              :to="localPath('/signin')"
              class="v-btn text-button navItem mr-4"
              exact
            >
              <!-- <v-icon start>mdi-login</v-icon> -->
              {{ $t("components.navbar.signin") }}
            </NuxtLink>

            <NuxtLink
              :to="localPath('/about')"
              class="v-btn text-button navItem mr-4"
              exact
            >
              <!-- <v-icon start>mdi-account-group</v-icon> -->
              {{ $t("components.navbar.aboutus") }}
            </NuxtLink>

            <NuxtLink
              :to="localPath('/profiles')"
              class="v-btn text-button navItem mr-4"
              exact
            >
              <!-- <v-icon start>mdi-monitor-account</v-icon> -->
              {{ $t("components.navbar.free-chat") }}
            </NuxtLink>
          </v-row>
        </nav>
        <LanguageSwitcher class="ml-3 mb-2" />

        <!-- Mobile menu -->
        <div class="d-flex d-md-none">
          <v-menu>
            <template #activator="{ props }">
              <v-app-bar-nav-icon v-bind="props" />
            </template>

            <v-list aria-label="Mobile Navigation">
              <v-list-item
                :to="localPath('/articles')"
                prepend-icon="mdi-post-outline"
                >{{ $t("components.navbar.blog") }}</v-list-item
              >
              <v-list-item
                :to="localPath('/signin')"
                prepend-icon="mdi-login"
                >{{ $t("components.navbar.signin") }}</v-list-item
              >
              <v-list-item
                :to="localPath('/about')"
                prepend-icon="mdi-account-group"
                >{{ $t("components.navbar.aboutus") }}</v-list-item
              >
              <v-list-item
                :to="localPath('/profiles')"
                prepend-icon="mdi-monitor-account"
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
          <v-col class="text-center">{{
            $t("pages.home.landing_page.logout_confirm")
          }}</v-col></v-row
        >
      </v-card-text>

      <template v-slot:actions>
        <v-btn color="primary" text @click="confirmLogout">{{
          $t("pages.home.landing_page.logout_confirm_button")
        }}</v-btn>

        <v-spacer></v-spacer>
        <v-btn class="ms-auto" @click="logoutDialog = false">
          {{ $t("pages.home.landing_page.cancel") }}</v-btn
        >
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore";
import { useI18n } from "vue-i18n";

const localPath = useLocalePath();
const router = useRouter();
const authStore = useAuthStore();
const logoutDialog = ref(false);
const isAuthenticated = computed(() => !!authStore.user);
const navProfileUserId = computed(() => authStore.userProfile?.user_id);

const { locale, availableLocales: rawLocales, setLocale } = useI18n();
const currentLocale = ref(locale.value);

const flagPaths = {
  en: "/images/flags/icon_us.png",
  fr: "/images/flags/icon_fr.png",
};

// const availableLocales = rawLocales.map((code) => ({
//   code,
//   flag: flagPaths[code] || "/images/flags/default.png", // fallback
// }));

// Logout helpers
const showLogoutDialog = () => {
  logoutDialog.value = true;
};

const confirmLogout = async () => {
  logoutDialog.value = false;
  router.push(localPath("/logout"));
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
.flag-dropdown .v-field__input {
  padding: 0 4px;
  min-height: 32px;
  width: 40px;
  justify-content: center;
}

.flag-dropdown .v-input__control,
.flag-dropdown .v-field {
  border: none !important;
  box-shadow: none !important;
}
</style>
