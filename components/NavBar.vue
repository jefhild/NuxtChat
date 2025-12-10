<template>
  <nav aria-label="Main Navigation">
    <v-app-bar
      app
      flat
      density="compact"
      class="nav-bar"
      image="/images/bkg/tiediebkg2.webp"
      alt="navbar background image"
    >
      <v-app-bar-title class="siteTitle">
        <NuxtLink class="title-link" :to="localPath('/')">
          {{ $t("components.navbar.imchatty") }}
        </NuxtLink>
        <img
          class="robot-float"
          src="/images/avatars/robot.png"
          alt="ImChatty robot"
          width="28"
          height="28"
          loading="lazy"
        />
      </v-app-bar-title>

      <v-spacer />

      <template #append>
        <div class="d-none d-md-flex nav-row">
          <ul class="nav-links">
            <li>
              <NuxtLink :to="localPath('/articles')" class="nav-link" exact>
                {{ $t("components.navbar.blog") }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localPath('/chat/articles')" class="nav-link" exact>
                {{ $t("components.navbar.discussions") }}
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localPath('/chat')" class="nav-link" exact>
                {{ $t("components.navbar.chat") }}
              </NuxtLink>
            </li>
            <li v-if="userProfile?.is_admin">
              <NuxtLink :to="localPath('/admin')" class="nav-link" exact>
                {{ $t("components.navbar.admin") }}
              </NuxtLink>
            </li>
            <li v-if="isAuthenticated">
              <NuxtLink :to="localPath('/settings')" class="nav-link" exact>
                {{ $t("components.navbar.settings") }}
              </NuxtLink>
            </li>
            <li v-if="isAuthenticated">
              <button class="nav-link btn-like" type="button" @click="showLogoutDialog">
                {{ $t("components.navbar.logout") }}
              </button>
            </li>
            <li v-else>
              <NuxtLink :to="localPath('/signin')" class="nav-link" exact>
                {{ $t("components.navbar.signin") }}
              </NuxtLink>
            </li>
          </ul>

          <div class="language-switcher d-none d-md-flex" aria-label="Language selector">
            <LanguageSwitcher />
          </div>
        </div>

        <!-- Mobile -->
        <div class="d-flex d-md-none">
          <v-menu :close-on-content-click="false">
            <template #activator="{ props }">
              <v-app-bar-nav-icon v-bind="props" />
            </template>

            <v-list aria-label="Mobile Navigation">
              <v-list-item :to="localPath('/articles')" link>
                <v-list-item-title>{{ $t("components.navbar.blog") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :to="localPath('/chat/articles')" link>
                <v-list-item-title>{{ $t("components.navbar.discussions") }}</v-list-item-title>
              </v-list-item>
              <v-list-item :to="localPath('/chat')" link>
                <v-list-item-title>{{ $t("components.navbar.chat") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="userProfile?.is_admin" :to="localPath('/admin')" link>
                <v-list-item-title>{{ $t("components.navbar.admin") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="isAuthenticated" :to="localPath('/settings')" link>
                <v-list-item-title>{{ $t("components.navbar.settings") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="isAuthenticated" @click="showLogoutDialog">
                <v-list-item-title>{{ $t("components.navbar.logout") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-else :to="localPath('/signin')" link>
                <v-list-item-title>{{ $t("components.navbar.signin") }}</v-list-item-title>
              </v-list-item>

              <v-divider class="my-1" />
              <v-list-item aria-label="Language selector">
                <LanguageSwitcher />
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </template>
    </v-app-bar>

    <v-dialog v-model="logoutDialog" width="auto" :scrim="!isLoggingOut">
      <v-card max-width="420" class="logout-dialog-card" prepend-icon="mdi-account-remove">
        <template #title>
          {{ isLoggingOut ? $t("components.navbar.logout") : "Logout Of My Account" }}
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
            <v-btn v-if="logoutError" color="primary" variant="text" @click="confirmLogout">
              {{ $t("common.try_again") || "Try again" }}
            </v-btn>
            <v-spacer />
            <v-btn :disabled="!logoutError" class="ms-auto" @click="logoutDialog = false">
              {{ $t("pages.home.landing_page.cancel") }}
            </v-btn>
          </template>
        </template>
      </v-card>
    </v-dialog>
  </nav>
</template>

<script setup>
import { useAuthStore } from "@/stores/authStore1";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";

const authStore = useAuthStore();
const router = useRouter();
const localPath = useLocalePath();

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const userProfile = computed(() => authStore.userProfile);

const logoutDialog = ref(false);
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
const currentLogoutLine = computed(() => logoutLines[lineIdx.value % logoutLines.length]);
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
    await authStore.logout();
    stopLogoutAnimation();
    logoutDialog.value = false;
    await router.replace(localPath("/"));
  } catch (err) {
    logoutError.value = err?.message || "Something went wrong while logging out.";
    stopLogoutAnimation();
    isLoggingOut.value = true;
  }
};
</script>

<style scoped>
.nav-bar {
  background: transparent;
  backdrop-filter: none;
  padding-inline: 12px;
}

.siteTitle {
  font-family: "Amatic SC", sans-serif;
  font-size: 2.4rem;
  font-weight: 700;
  line-height: 1.1;
  color: #7b6ddc;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.siteTitle a {
  color: inherit;
  text-decoration: none;
}

.robot-float {
  display: inline-block;
  animation: space-bob 4.5s ease-in-out infinite;
  transform-origin: center;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
}

@keyframes space-bob {
  0% {
    transform: translateY(0px) rotate(0deg);
  }
  25% {
    transform: translateY(-4px) rotate(-2deg);
  }
  50% {
    transform: translateY(0px) rotate(0deg);
  }
  75% {
    transform: translateY(4px) rotate(2deg);
  }
  100% {
    transform: translateY(0px) rotate(0deg);
  }
}

.nav-row {
  align-items: flex-start;
  justify-content: flex-end;
  width: 100%;
  padding-top: 4px;
  gap: 12px;
}

.nav-links {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-link {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.95rem;
  padding: 4px 4px;
}

.nav-link:hover {
  text-decoration: underline;
}

.btn-like {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.language-switcher :deep(.v-field__input) {
  min-height: 34px;
}

.language-switcher {
  display: flex;
  align-items: center;
}

.logout-dialog-card {
  width: 360px;
  max-width: 90vw;
}
</style>
