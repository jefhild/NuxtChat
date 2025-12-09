<template>
  <nav>
    <v-app-bar
      app
      image="/images/bkg/tiediebkg2.webp"
      alt="navbar background image"
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink :to="localPath('/')">{{
          $t("components.navbar.imchatty")
        }}</NuxtLink>
      </v-app-bar-title>
      <v-spacer></v-spacer>

      <template v-slot:append>
        <nav aria-label="Main Navigation" class="main-nav-wrapper">
          <ul class="main-nav-list d-none d-md-flex">
            <li>
              <NuxtLink
                :to="localPath('/articles')"
                class="v-btn text-button navItem mr-4 d-flex align-center"
                exact
              >
                {{ $t("components.navbar.blog") }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                :to="localPath('/chat/articles')"
                class="v-btn text-button navItem mr-4"
                exact
              >
                {{ $t("components.navbar.discussions") }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                :to="localPath('/chat')"
                class="v-btn text-button navItem mr-4"
                exact
              >
                {{ $t("components.navbar.chat") }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink
                :to="localPath('/signin')"
                class="v-btn text-button navItem mr-4"
                exact
              >
                <v-icon start>mdi-login</v-icon>
                {{ $t("components.navbar.signin") }}
              </NuxtLink>
            </li>
          </ul>

          <!-- Invisible-but-present copy to satisfy mobile-first indexing; keeps primary nav links in the DOM on small viewports -->
          <ul class="main-nav-crawler">
            <li><NuxtLink :to="localPath('/articles')">{{ $t("components.navbar.blog") }}</NuxtLink></li>
            <li><NuxtLink :to="localPath('/chat/articles')">{{ $t("components.navbar.discussions") }}</NuxtLink></li>
            <li><NuxtLink :to="localPath('/chat')">{{ $t("components.navbar.chat") }}</NuxtLink></li>
            <li><NuxtLink :to="localPath('/signin')">{{ $t("components.navbar.signin") }}</NuxtLink></li>
          </ul>

          <div class="d-none d-md-flex align-center">
            <v-row align="center" no-gutters>
              <v-col v-if="userProfile?.is_admin">
                <NuxtLink
                  :to="localPath('/admin')"
                  class="v-btn text-button navItem mr-3"
                  exact
                >
                  {{ $t("components.navbar.admin") }}
                </NuxtLink>
              </v-col>

              <v-col v-if="isAuthenticated">
                <NuxtLink
                  :to="localPath('/settings')"
                  class="v-btn text-button navItem mr-3"
                  exact
                >
                  <v-icon start>mdi-cog</v-icon>
                  {{ $t("components.navbar.settings") }}
                </NuxtLink>
              </v-col>

              <v-col v-if="isAuthenticated">
                <v-btn @click="showLogoutDialog" variant="text">
                  <v-icon start>mdi-logout</v-icon>
                  {{ $t("components.navbar.logout") }}
                </v-btn>
              </v-col>
            </v-row>

            <v-row no-gutters><LanguageSwitcher /></v-row>
          </div>
        </nav>

        <!-- Mobile menu -->

        <v-row no-gutters>
          <div class="d-flex d-md-none">
            <v-menu>
              <template #activator="{ props }">
                <v-app-bar-nav-icon v-bind="props" />
              </template>

              <v-list aria-label="Mobile Navigation" class="mobile-nav-list">
                <v-list-item :to="localPath('/articles')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.blog")
                  }}</v-list-item-title>
                </v-list-item>

                <!-- <v-list-item :to="localPath('/about')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.aboutus")
                  }}</v-list-item-title>
                </v-list-item> -->

                <v-list-item :to="localPath('/chat/articles')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.discussions")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item :to="localPath('/chat')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.chat")
                  }}</v-list-item-title>
                </v-list-item>

                <!-- <v-list-item :to="localPath('/profiles')" link>
                  <v-list-item-title>{{
                    $t("components.navbar.free-chat")
                  }}</v-list-item-title>
                </v-list-item> -->

                <v-list-item
                  v-if="userProfile?.is_admin"
                  :to="localPath('/admin')"
                  link
                >
                  <v-list-item-title>{{
                    $t("components.navbar.admin")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-if="isAuthenticated"
                  :to="localPath('/settings')"
                  link
                >
                  <v-list-item-title>{{
                    $t("components.navbar.settings")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item v-if="isAuthenticated" @click="showLogoutDialog">
                  <v-list-item-title>{{
                    $t("components.navbar.logout")
                  }}</v-list-item-title>
                </v-list-item>

                <v-list-item
                  v-else
                  :to="localPath('/signin')"
                  append-icon="mdi-login"
                  link
                >
                  <v-list-item-title>{{
                    $t("components.navbar.signin")
                  }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </v-row>
      </template>
    </v-app-bar>
  </nav>

  <v-dialog v-model="logoutDialog" width="auto" :scrim="!isLoggingOut">
    <v-card
      max-width="420"
      class="logout-dialog-card"
      prepend-icon="mdi-account-remove"
    >
      <template #title>
        {{
          isLoggingOut ? $t("components.navbar.logout") : "Logout Of My Account"
        }}
      </template>

      <v-card-text>
        <v-row justify="center">
          <v-col class="text-center">
            <template v-if="!isLoggingOut">
              {{ $t("pages.home.landing_page.logout_confirm") }}
            </template>

            <template v-else>
              <div class="d-flex flex-column align-center py-3">
                <v-progress-circular indeterminate size="36" class="mb-3" />
                <div class="text-medium-emphasis">
                  {{ currentLogoutLine }}
                </div>
                <div v-if="logoutError" class="text-error mt-3">
                  {{ logoutError }}
                </div>
              </div>
            </template>
          </v-col>
        </v-row>
      </v-card-text>

      <template #actions>
        <template v-if="!isLoggingOut">
          <v-btn color="primary" text @click="confirmLogout">
            {{ $t("pages.home.landing_page.logout_confirm_button") }}
          </v-btn>
          <v-spacer />
          <v-btn class="ms-auto" @click="logoutDialog = false">
            {{ $t("pages.home.landing_page.cancel") }}
          </v-btn>
        </template>

        <template v-else>
          <v-btn
            v-if="logoutError"
            color="primary"
            variant="text"
            @click="confirmLogout"
          >
            {{ $t("common.try_again") || "Try again" }}
          </v-btn>
          <v-spacer />
          <v-btn
            :disabled="!logoutError"
            class="ms-auto"
            @click="logoutDialog = false"
          >
            {{ $t("pages.home.landing_page.cancel") }}
          </v-btn>
        </template>
      </template>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
// import { useI18n } from "vue-i18n";

const localPath = useLocalePath();
const router = useRouter();
const authStore = useAuthStore();
const logoutDialog = ref(false);
const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const userProfile = computed(() => authStore.userProfile);

const isLoggingOut = ref(false);
const logoutError = ref("");
const logoutLines = [
  "Deleting presence…",
  "Disconnecting messages…",
  "Silencing your admirers…",
  "Packing your bags…",
  "Sweeping cookie crumbs…",
  "Politely leaving the chat…",
  "Waving goodbye 👋…",
];
const lineIdx = ref(0);
const currentLogoutLine = computed(
  () => logoutLines[lineIdx.value % logoutLines.length]
);
let rotateTimer = null;

function startLogoutAnimation() {
  stopLogoutAnimation();
  lineIdx.value = 0;
  rotateTimer = setInterval(() => {
    lineIdx.value++;
  }, 800);
}
function stopLogoutAnimation() {
  if (rotateTimer) {
    clearInterval(rotateTimer);
    rotateTimer = null;
  }
}

onBeforeUnmount(stopLogoutAnimation);

const showLogoutDialog = () => {
  logoutError.value = "";
  isLoggingOut.value = false;
  logoutDialog.value = true;
};

const confirmLogout = async () => {
  logoutError.value = "";
  isLoggingOut.value = true;
  startLogoutAnimation();

  try {
    // do the real logout work
    await authStore.logout(); // your existing action

    // success → close + redirect (replace to avoid “Back” reviving old page)
    stopLogoutAnimation();
    logoutDialog.value = false;
    await router.replace(localPath("/"));
  } catch (e) {
    // show a friendly error and leave dialog open with a retry button
    logoutError.value = e?.message || "Something went wrong while logging out.";
    stopLogoutAnimation();
    isLoggingOut.value = true; // keep processing view; user can retry
  }
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

.main-nav-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
}

.main-nav-list {
  list-style: none;
  display: flex;
  align-items: center;
  padding: 0;
  margin: 0;
}

.main-nav-list li {
  margin: 0;
}

.main-nav-crawler {
  position: absolute;
  left: -9999px;
  top: auto;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
  padding: 0;
  margin: 0;
}

.language-switcher-row {
  display: flex;
  justify-content: flex-end;
}

.logout-dialog-card {
  width: 360px;
  max-width: 90vw;
}

.mobile-nav-list {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
