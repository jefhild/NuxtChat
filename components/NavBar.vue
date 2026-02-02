<template>
  <div class="nav2-shell">
    <header ref="navRef" class="nav2" :class="navClasses">
      <div class="nav2__inner">
        <div class="nav2__brand-wrap">
          <NuxtLink class="nav2__brand" :to="localPath('/')">
            {{ $t("components.navbar.imchatty") }}
          </NuxtLink>
          <img
            class="nav2__robot"
            src="/images/avatars/robot.png"
            alt="ImChatty robot"
            width="28"
            height="28"
            loading="lazy"
          />
        </div>

        <nav class="nav2__links d-none d-md-flex" aria-label="Primary navigation">
          <ul class="nav2__list">
            <li>
              <NuxtLink
                :to="localPath('/chat')"
                :class="['nav2__link', { 'nav2__link--chat': hasUnread }]"
                exact
              >
                {{ $t("components.navbar.chat") }}
                <span v-if="hasUnread" class="nav2__badge" aria-hidden="true">
                  {{ unreadLabel }}
                </span>
              </NuxtLink>
            </li>
            <li>
              <NuxtLink :to="localPath('/articles')" class="nav2__link" exact>
                {{ $t("components.navbar.blog") }}
              </NuxtLink>
            </li>
            <li v-if="userProfile?.is_admin">
              <NuxtLink :to="localPath('/admin')" class="nav2__link" exact>
                {{ $t("components.navbar.admin") }}
              </NuxtLink>
            </li>
            <li v-if="isAuthenticated">
              <NuxtLink :to="localPath('/settings')" class="nav2__link" exact>
                {{ $t("components.navbar.settings") }}
              </NuxtLink>
            </li>
            <li v-if="isAuthenticated">
              <button class="nav2__link nav2__btn-like" type="button" @click="showLogoutDialog">
                {{ $t("components.navbar.logout") }}
              </button>
            </li>
            <li v-else>
              <NuxtLink :to="localPath('/signin')" class="nav2__link" exact>
                {{ $t("components.navbar.signin") }}
              </NuxtLink>
            </li>
          </ul>

          <div class="nav2__lang d-none d-md-flex" aria-label="Language selector">
            <LanguageSwitcher />
          </div>
        </nav>

        <div class="d-flex d-md-none align-center nav2__mobile-actions">
          <div class="nav2__lang nav2__lang--mobile" aria-label="Language selector">
            <LanguageSwitcher />
          </div>
          <v-menu v-model="mobileMenuOpen" :close-on-content-click="false">
            <template #activator="{ props }">
              <button
                class="nav2__menu"
                type="button"
                aria-label="Menu"
                v-bind="props"
                :style="{ color: menuIconColor }"
              >
                <span class="nav2__menu-bar" />
                <span class="nav2__menu-bar" />
                <span class="nav2__menu-bar" />
              </button>
            </template>

            <v-list aria-label="Mobile Navigation">
              <v-list-item :to="localPath('/chat')" link @click="closeMobileMenu">
                <v-list-item-title class="nav2__mobile-title">
                  {{ $t("components.navbar.chat") }}
                  <span
                    v-if="hasUnread"
                    class="nav2__badge nav2__badge--inline"
                    aria-hidden="true"
                  >
                    {{ unreadLabel }}
                  </span>
                </v-list-item-title>
              </v-list-item>
              <v-list-item :to="localPath('/articles')" link @click="closeMobileMenu">
                <v-list-item-title>{{ $t("components.navbar.blog") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="userProfile?.is_admin" :to="localPath('/admin')" link @click="closeMobileMenu">
                <v-list-item-title>{{ $t("components.navbar.admin") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="isAuthenticated" :to="localPath('/settings')" link @click="closeMobileMenu">
                <v-list-item-title>{{ $t("components.navbar.settings") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-if="isAuthenticated" @click="handleMobileLogout">
                <v-list-item-title>{{ $t("components.navbar.logout") }}</v-list-item-title>
              </v-list-item>
              <v-list-item v-else :to="localPath('/signin')" link @click="closeMobileMenu">
                <v-list-item-title>{{ $t("components.navbar.signin") }}</v-list-item-title>
              </v-list-item>
            </v-list>
          </v-menu>
        </div>
      </div>
    </header>

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
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore1";
import { useMessagesStore } from "@/stores/messagesStore";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";

const authStore = useAuthStore();
const messages = useMessagesStore();
const router = useRouter();
const route = useRoute();
const localPath = useLocalePath();
const isClient = typeof window !== "undefined";
const navRef = ref(null);

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const userProfile = computed(() => authStore.userProfile);
const unreadCount = computed(() => messages.totalUnread || 0);
const hasUnread = computed(() => unreadCount.value > 0);
const unreadLabel = computed(() =>
  unreadCount.value > 99 ? "99+" : `${unreadCount.value}`
);

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

const normalizePath = (p = "") => {
  const trimmed = p.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
};

const isHome = ref(false);
const isScrolled = ref(false);
const mobileMenuOpen = ref(false);
const NAV_OFFSET_VAR = "--nav2-offset";

const computeIsHome = () => {
  const browserPath = isClient ? normalizePath(window.location?.pathname || "") : "";
  const currentPath = normalizePath(route.path || route.fullPath || browserPath || "");
  const home = normalizePath(localPath("/") || "/");

  isHome.value = browserPath === "/" || currentPath === "/" || currentPath === home;
};

const updateScrollState = () => {
  if (!isClient) return;
  if (!isHome.value) {
    isScrolled.value = true;
    return;
  }
  isScrolled.value = window.scrollY > 40;
};

const navClasses = computed(() => ({
  "nav2--transparent": isHome.value && !isScrolled.value,
  "nav2--solid": !isHome.value || isScrolled.value,
}));

const menuIconColor = computed(() =>
  isHome.value && !isScrolled.value ? "#ffffff" : "#0f172a"
);

const applyNavOffsetVar = () => {
  if (!isClient) return;
  const height = navRef.value?.offsetHeight || 72;
  const value = isHome.value ? "0px" : `${height}px`;
  document.documentElement.style.setProperty(NAV_OFFSET_VAR, value);
};

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

const handleMobileLogout = () => {
  closeMobileMenu();
  showLogoutDialog();
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
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

onMounted(() => {
  computeIsHome();
  updateScrollState();
  applyNavOffsetVar();
  if (isClient) {
    window.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", applyNavOffsetVar, { passive: true });
  }
});

watch(
  () => [route.path, route.name],
  () => {
    computeIsHome();
    isScrolled.value = false;
    updateScrollState();
    applyNavOffsetVar();
  }
);

onBeforeUnmount(() => {
  if (!isClient) return;
  window.removeEventListener("scroll", updateScrollState);
  window.removeEventListener("resize", applyNavOffsetVar);
  document.documentElement.style.setProperty(NAV_OFFSET_VAR, "0px");
});
</script>

<style scoped>
.nav2 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1500;
  padding: 8px 14px;
  color: #ffffff;
  transition: background-color 180ms ease, backdrop-filter 180ms ease, box-shadow 180ms ease,
    color 180ms ease;
}

.nav2__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1280px;
  margin: 0 auto;
}

.nav2__brand-wrap {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.nav2__brand {
  font-family: "Amatic SC", sans-serif;
  font-size: 1.9rem;
  font-weight: 700;
  color: inherit;
  text-decoration: none;
}

.nav2__robot {
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

.nav2__links {
  align-items: center;
  display: flex;
  gap: 12px;
}

.nav2__list {
  display: flex;
  align-items: center;
  gap: 12px;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav2__link {
  color: inherit;
  text-decoration: none;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.92rem;
  padding: 2px 2px;
}

.nav2__link--chat {
  position: relative;
  padding-right: 18px;
}

.nav2__badge {
  position: absolute;
  top: -8px;
  right: -6px;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 9999px;
  background: #ff3b30;
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
}

.nav2__badge--inline {
  position: relative;
  top: -1px;
  right: -2px;
  margin-left: 6px;
}

.nav2__link:hover,
.nav2__link:focus-visible {
  text-decoration: underline;
}

.nav2__btn-like {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

.nav2__lang :deep(.v-field__input) {
  min-height: 34px;
}

.nav2__mobile-actions {
  gap: 10px;
}

.nav2__lang--mobile :deep(.v-field__input) {
  min-height: 32px;
}

.logout-dialog-card {
  width: 360px;
  max-width: 90vw;
}

.nav2__menu {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 4px;
  background: none;
  border: none;
  cursor: pointer;
}

.nav2__menu-bar {
  width: 20px;
  height: 2px;
  background: currentColor;
  border-radius: 99px;
}

.nav2--transparent {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.15), transparent);
  backdrop-filter: none;
  box-shadow: none;
}

.nav2--solid {
  background: rgba(255, 255, 255, 0.9);
  color: #0f172a;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgba(15, 23, 42, 0.08);
}

@media (max-width: 960px) {
  .nav2 {
    padding: 8px 10px;
  }
  .nav2__brand {
    font-size: 1.6rem;
  }
}
</style>
