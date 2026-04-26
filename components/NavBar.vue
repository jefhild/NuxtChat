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

        <nav class="nav2__links nav2__links--desktop" aria-label="Primary navigation">
          <ul class="nav2__list">
            <li v-for="item in primaryNavItems" :key="item.id">
              <NuxtLink
                :to="item.path"
                :class="[
                  'nav2__link',
                  { 'nav2__link--chat': item.id === 'chat' && hasUnread },
                ]"
                exact
              >
                {{ item.name }}
                <span
                  v-if="item.id === 'chat' && hasUnread"
                  class="nav2__badge"
                  aria-hidden="true"
                >
                  {{ unreadLabel }}
                </span>
              </NuxtLink>
            </li>
            <li v-if="showResolvedAuthLinks && userProfile?.is_admin && !isImpersonating">
              <NuxtLink :to="localPath('/admin')" class="nav2__link" exact>
                {{ $t("components.navbar.admin") }}
              </NuxtLink>
            </li>
            <li v-if="showResolvedAuthLinks && isAuthenticated">
              <NuxtLink :to="localPath('/settings')" class="nav2__link" exact>
                {{ $t("components.navbar.settings") }}
              </NuxtLink>
            </li>
            <li v-if="showResolvedAuthLinks && isAuthenticated">
              <button class="nav2__link nav2__btn-like" type="button" @click="showLogoutDialog">
                {{ $t("components.navbar.logout") }}
              </button>
            </li>
            <li v-else-if="showResolvedAuthLinks">
              <NuxtLink :to="localPath('/signin')" class="nav2__link" exact>
                {{ $t("components.navbar.signin") }}
              </NuxtLink>
            </li>
          </ul>

          <div class="nav2__lang nav2__lang--desktop" aria-label="Language selector">
            <LanguageSwitcher />
            <NuxtLink
              v-if="isImpersonating"
              :to="localPath('/admin')"
              class="nav2__admin-dot"
              aria-label="Return to admin"
            />
          </div>
        </nav>

        <div class="nav2__mobile-actions">
          <div class="nav2__lang nav2__lang--mobile" aria-label="Language selector">
            <LanguageSwitcher />
            <NuxtLink
              v-if="isImpersonating"
              :to="localPath('/admin')"
              class="nav2__admin-dot"
              aria-label="Return to admin"
            />
          </div>
          <button
            class="nav2__menu"
            type="button"
            aria-label="Menu"
            :aria-expanded="mobileMenuOpen ? 'true' : 'false'"
            aria-controls="nav2-mobile-menu"
            @click="toggleMobileMenu"
          >
            <span class="nav2__menu-bar" />
            <span class="nav2__menu-bar" />
            <span class="nav2__menu-bar" />
          </button>
        </div>
      </div>
    </header>

    <Teleport to="body">
      <Transition name="nav2-fade">
        <button
          v-if="mobileMenuOpen"
          type="button"
          class="nav2__scrim"
          aria-label="Close mobile menu"
          @click="closeMobileMenu"
        />
      </Transition>
      <Transition name="nav2-slide-down">
        <div
          v-if="mobileMenuOpen"
          id="nav2-mobile-menu"
          class="nav2__mobile-panel"
          :style="mobileMenuStyle"
          aria-label="Mobile Navigation"
        >
          <nav class="nav2__mobile-nav">
            <NuxtLink
              v-for="item in primaryNavItems"
              :key="item.id"
              :to="item.path"
              class="nav2__mobile-item"
              @click="closeMobileMenu"
            >
              <span class="nav2__mobile-title">
                {{ item.name }}
                <span
                  v-if="item.id === 'chat' && hasUnread"
                  class="nav2__badge nav2__badge--inline"
                  aria-hidden="true"
                >
                  {{ unreadLabel }}
                </span>
              </span>
            </NuxtLink>
            <NuxtLink
              v-if="userProfile?.is_admin && !isImpersonating"
              :to="localPath('/admin')"
              class="nav2__mobile-item"
              @click="closeMobileMenu"
            >
              <span class="nav2__mobile-title">{{ $t("components.navbar.admin") }}</span>
            </NuxtLink>
            <NuxtLink
              v-if="showResolvedAuthLinks && isAuthenticated"
              :to="localPath('/settings')"
              class="nav2__mobile-item"
              @click="closeMobileMenu"
            >
              <span class="nav2__mobile-title">{{ $t("components.navbar.settings") }}</span>
            </NuxtLink>
            <button
              v-if="showResolvedAuthLinks && isAuthenticated"
              type="button"
              class="nav2__mobile-item nav2__mobile-item--button"
              @click="handleMobileLogout"
            >
              <span class="nav2__mobile-title">{{ $t("components.navbar.logout") }}</span>
            </button>
            <NuxtLink
              v-else-if="showResolvedAuthLinks"
              :to="localPath('/signin')"
              class="nav2__mobile-item"
              @click="closeMobileMenu"
            >
              <span class="nav2__mobile-title">{{ $t("components.navbar.signin") }}</span>
            </NuxtLink>
          </nav>
        </div>
      </Transition>

      <Transition name="nav2-fade">
        <div
          v-if="logoutDialog"
          class="nav2__dialog-layer"
          role="presentation"
        >
          <button
            type="button"
            class="nav2__dialog-backdrop"
            :class="{ 'nav2__dialog-backdrop--transparent': isLoggingOut && !logoutError }"
            aria-label="Close logout dialog"
            @click="dismissLogoutDialog"
          />
          <div
            class="nav2__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nav2-logout-title"
          >
            <div class="logout-dialog-card">
              <div class="logout-dialog-card__header">
                <i class="mdi mdi-account-remove logout-dialog-card__icon" aria-hidden="true" />
                <h2 id="nav2-logout-title" class="logout-dialog-card__title">
                  {{
                    isLoggingOut
                      ? $t("components.navbar.logout")
                      : $t("components.navbar.logout_dialog_title")
                  }}
                </h2>
              </div>

              <div class="logout-dialog-card__body">
                <template v-if="!isLoggingOut">
                  <div v-if="isAnonAuthenticated" class="logout-dialog-card__message">
                    {{ $t("components.navbar.logout_email_prompt") }}
                  </div>
                  <div v-else class="logout-dialog-card__message">
                    {{ $t("pages.home.landing_page.logout_confirm") }}
                  </div>
                </template>

                <template v-else>
                  <div class="logout-dialog-card__loading">
                    <span class="logout-dialog-card__spinner" aria-hidden="true" />
                    <div class="logout-dialog-card__status">
                      {{ currentLogoutLine }}
                    </div>
                    <div v-if="logoutError" class="logout-dialog-card__error">
                      {{ logoutError }}
                    </div>
                  </div>
                </template>
              </div>

              <div class="logout-dialog-card__actions">
                <template v-if="!isLoggingOut">
                  <template v-if="isAnonAuthenticated">
                    <div class="logout-actions-stack">
                      <button
                        type="button"
                        class="nav2__action-btn nav2__action-btn--primary nav2__action-btn--block"
                        @click="goToLinkEmail"
                      >
                        {{ $t("components.navbar.logout_add_email_now") }}
                      </button>
                      <button
                        type="button"
                        class="nav2__action-btn nav2__action-btn--ghost nav2__action-btn--block"
                        @click="confirmLogout"
                      >
                        {{ $t("components.navbar.logout_anyway") }}
                      </button>
                      <button
                        type="button"
                        class="nav2__action-btn nav2__action-btn--plain nav2__action-btn--block"
                        @click="logoutDialog = false"
                      >
                        {{ $t("pages.home.landing_page.cancel") }}
                      </button>
                    </div>
                  </template>
                  <template v-else>
                    <button
                      type="button"
                      class="nav2__action-btn nav2__action-btn--ghost"
                      @click="confirmLogout"
                    >
                      {{ $t("pages.home.landing_page.logout_confirm_button") }}
                    </button>
                    <button
                      type="button"
                      class="nav2__action-btn nav2__action-btn--plain"
                      @click="logoutDialog = false"
                    >
                      {{ $t("pages.home.landing_page.cancel") }}
                    </button>
                  </template>
                </template>

                <template v-else>
                  <button
                    v-if="logoutError"
                    type="button"
                    class="nav2__action-btn nav2__action-btn--ghost"
                    @click="confirmLogout"
                  >
                    {{ $t("common.try_again") || "Try again" }}
                  </button>
                  <button
                    type="button"
                    class="nav2__action-btn nav2__action-btn--plain"
                    :disabled="!logoutError"
                    @click="logoutDialog = false"
                  >
                    {{ $t("pages.home.landing_page.cancel") }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/authStore1";
import { useMessagesStore } from "@/stores/messagesStore";
import LanguageSwitcher from "@/components/LanguageSwitcher.vue";
import { usePrimaryNavigation } from "@/composables/usePrimaryNavigation";

const authStore = useAuthStore();
const messages = useMessagesStore();
const router = useRouter();
const route = useRoute();
const localPath = useLocalePath();
const isClient = typeof window !== "undefined";
const navRef = ref(null);
const { primaryNavItems } = usePrimaryNavigation();

const isAuthenticated = computed(() =>
  ["anon_authenticated", "authenticated"].includes(authStore.authStatus)
);
const showResolvedAuthLinks = computed(() => authStore.authResolved);
const isAnonAuthenticated = computed(
  () => authStore.authStatus === "anon_authenticated"
);
const userProfile = computed(() => authStore.userProfile);
const isImpersonating = computed(() => {
  if (!userProfile.value?.is_admin) return false;
  let v = route.query?.asUser ?? route.query?.asuser ?? route.query?.as_user;
  if (Array.isArray(v)) v = v[0];
  return v != null && String(v).trim().length > 0;
});
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
const navHeight = ref(72);
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

const applyNavOffsetVar = () => {
  if (!isClient) return;
  const rawHeight = Number(navRef.value?.offsetHeight || 72);
  const safeHeight = Math.min(Math.max(rawHeight, 56), 96);
  navHeight.value = safeHeight;
  if (window.innerWidth >= 960) {
    mobileMenuOpen.value = false;
  }
  const value = isHome.value ? "0px" : `${safeHeight}px`;
  document.documentElement.style.setProperty(NAV_OFFSET_VAR, value);
};

const mobileMenuStyle = computed(() => ({
  top: `${navHeight.value + 8}px`,
}));

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

const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value;
};

const closeMobileMenu = () => {
  mobileMenuOpen.value = false;
};

const dismissLogoutDialog = () => {
  if (isLoggingOut.value && !logoutError.value) return;
  logoutDialog.value = false;
};

const goToLinkEmail = async () => {
  logoutDialog.value = false;
  await router.push(localPath({ path: "/settings", query: { linkEmail: "1" } }));
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
    closeMobileMenu();
  }
);

const onGlobalKeydown = (event) => {
  if (event.key !== "Escape") return;
  if (mobileMenuOpen.value) {
    closeMobileMenu();
    return;
  }
  if (logoutDialog.value) {
    dismissLogoutDialog();
  }
};

onBeforeUnmount(() => {
  if (!isClient) return;
  window.removeEventListener("scroll", updateScrollState);
  window.removeEventListener("resize", applyNavOffsetVar);
  document.removeEventListener("keydown", onGlobalKeydown);
  document.documentElement.style.setProperty(NAV_OFFSET_VAR, "0px");
});

onMounted(() => {
  if (!isClient) return;
  document.addEventListener("keydown", onGlobalKeydown);
});
</script>

<style scoped>
.nav2 {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2100;
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

.nav2__links--desktop {
  flex: 1 1 auto;
  justify-content: flex-end;
  min-width: 0;
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
  box-shadow: 0 0 0 2px rgb(var(--color-surface) / 0.95);
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

.nav2__mobile-actions {
  display: none;
  align-items: center;
  gap: 10px;
}

.nav2__lang--desktop {
  display: inline-flex;
  align-items: center;
}

.logout-dialog-card {
  width: min(440px, 94vw);
  max-width: 94vw;
  border-radius: 20px;
  border: 1px solid rgb(var(--color-border) / 0.7);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  box-shadow: 0 24px 60px rgb(var(--color-shadow) / 0.24);
  padding: 20px;
}

.logout-actions-stack {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav2__menu {
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 4px;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
}

.nav2__menu-bar {
  width: 20px;
  height: 2px;
  background: currentColor;
  border-radius: 99px;
}

.nav2__admin-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-left: 8px;
  border-radius: 999px;
  background: #16a34a;
  opacity: 0.55;
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.nav2__admin-dot:hover,
.nav2__admin-dot:focus-visible {
  opacity: 0.9;
  transform: scale(1.1);
}

.nav2--transparent {
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0.15), transparent);
  backdrop-filter: none;
  box-shadow: none;
}

.nav2--solid {
  background: rgb(var(--color-surface) / 0.92);
  color: rgb(var(--color-foreground));
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 28px rgb(var(--color-shadow) / 0.14);
}

.nav2__scrim {
  position: fixed;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.28);
  z-index: 2090;
}

.nav2__mobile-panel {
  position: fixed;
  right: 10px;
  width: min(320px, calc(100vw - 20px));
  border-radius: 18px;
  border: 1px solid rgb(var(--color-border) / 0.72);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  box-shadow: 0 20px 48px rgb(var(--color-shadow) / 0.22);
  z-index: 2105;
  overflow: hidden;
}

.nav2__mobile-nav {
  display: flex;
  flex-direction: column;
  padding: 10px;
}

.nav2__mobile-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 12px 14px;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  text-decoration: none;
  text-align: left;
}

.nav2__mobile-item--button {
  cursor: pointer;
  font: inherit;
}

.nav2__mobile-item:hover,
.nav2__mobile-item:focus-visible {
  background: rgb(var(--color-foreground) / 0.06);
  outline: none;
}

.nav2__mobile-title {
  display: inline-flex;
  align-items: center;
  font-size: 0.96rem;
  font-weight: 600;
}

.nav2__dialog-layer {
  position: fixed;
  inset: 0;
  z-index: 2300;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.nav2__dialog-backdrop {
  position: absolute;
  inset: 0;
  border: 0;
  background: rgb(15 23 42 / 0.52);
}

.nav2__dialog-backdrop--transparent {
  background: transparent;
}

.nav2__dialog {
  position: relative;
  z-index: 1;
  width: min(440px, 94vw);
}

.logout-dialog-card__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.logout-dialog-card__icon {
  font-size: 1.35rem;
  color: rgb(var(--color-primary));
}

.logout-dialog-card__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
}

.logout-dialog-card__body {
  text-align: center;
}

.logout-dialog-card__message {
  color: rgb(var(--color-foreground) / 0.84);
  line-height: 1.55;
}

.logout-dialog-card__loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0 4px;
}

.logout-dialog-card__spinner {
  width: 36px;
  height: 36px;
  margin-bottom: 12px;
  border: 3px solid rgb(var(--color-border));
  border-top-color: rgb(var(--color-primary));
  border-radius: 999px;
  animation: nav2-spin 0.8s linear infinite;
}

.logout-dialog-card__status {
  color: rgb(var(--color-foreground) / 0.72);
}

.logout-dialog-card__error {
  margin-top: 12px;
  color: rgb(var(--color-danger));
}

.logout-dialog-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.nav2__action-btn {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 42px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease,
    opacity 160ms ease;
}

.nav2__action-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.nav2__action-btn--block {
  width: 100%;
}

.nav2__action-btn--primary {
  background: rgb(var(--color-primary));
  color: #fff;
}

.nav2__action-btn--primary:hover,
.nav2__action-btn--primary:focus-visible {
  background: rgb(var(--color-primary) / 0.9);
}

.nav2__action-btn--ghost {
  color: rgb(var(--color-primary));
}

.nav2__action-btn--ghost:hover,
.nav2__action-btn--ghost:focus-visible {
  background: rgb(var(--color-primary) / 0.08);
}

.nav2__action-btn--plain:hover,
.nav2__action-btn--plain:focus-visible {
  background: rgb(var(--color-foreground) / 0.06);
}

.nav2-fade-enter-active,
.nav2-fade-leave-active,
.nav2-slide-down-enter-active,
.nav2-slide-down-leave-active {
  transition: opacity 160ms ease, transform 160ms ease;
}

.nav2-fade-enter-from,
.nav2-fade-leave-to,
.nav2-slide-down-enter-from,
.nav2-slide-down-leave-to {
  opacity: 0;
}

.nav2-slide-down-enter-from,
.nav2-slide-down-leave-to {
  transform: translateY(-8px);
}

@keyframes nav2-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 960px) {
  .nav2__links--desktop {
    display: none;
  }

  .nav2__mobile-actions {
    display: inline-flex;
    margin-left: auto;
  }

  .nav2 {
    padding: 8px 10px;
  }

  .nav2__inner {
    gap: 12px;
  }

  .nav2__brand {
    font-size: 1.6rem;
  }

  .nav2__dialog-layer {
    padding: 14px;
  }

  .logout-dialog-card {
    padding: 18px;
  }

  .logout-dialog-card__actions {
    flex-direction: column;
  }
}
</style>
