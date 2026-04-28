<template>
  <NavBar />
  <FavoriteToast />
  <UpvoteToast />
  <!-- Main content; let children shrink to create scroll areas -->
  <main
    class="app-main flex min-h-0 flex-1 flex-col"
    :class="{
      'profiles-route-main': isProfilesRoute,
      'chat-route-main': isChatRoute,
      'feeds-route-main': isFeedsRoute,
      'match-route-main': isMatchRoute,
      'admin-route-main': isAdminRoute,
      'inline-footer-route-main': useInlineFooter,
      'root-landing-route-main': isRootLandingRoute,
    }"
    :style="mainStyle"
  >
    <!-- Optional container; keep min-h-0 so inner flex can shrink -->
    <div
      class="flex min-h-0 flex-grow flex-col px-0"
      :class="isProfilesRoute || isChatRoute || isFeedsRoute ? 'px-0' : 'sm:px-6'"
    >
      <!-- NuxtPage should be allowed to grow/shrink -->
      <div class="flex min-h-0 flex-grow flex-col">
        <NuxtPage />
      </div>
    </div>
  </main>

  <!-- FOOTER must be an app footer to reserve space -->
  <div
    v-if="showAppFooter && !isMobile"
    ref="footerRef"
    class="app-footer app-footer--desktop"
    :class="{
      'app-footer--inline': useInlineFooter,
      'app-footer--chat': isChatRoute,
      'app-footer--feeds': isFeedsRoute,
      'app-footer--toggleable': desktopFooterToggleEnabled,
      'app-footer--collapsible': desktopFooterToggleEnabled,
      'app-footer--hidden': desktopFooterToggleEnabled && !footerVisible,
    }"
  >
    <Footer />
  </div>

  <div
    v-else-if="showAppFooter"
    ref="footerRef"
    class="app-footer app-footer--mobile"
    :class="{
      'app-footer--inline': useInlineFooter,
      'app-footer--hidden': footerToggleEnabled && !footerVisible,
      'app-footer--chat': isChatRoute,
      'app-footer--feeds': isFeedsRoute,
    }"
    @touchstart.passive="onFooterTouchStart"
    @touchmove.passive="onFooterTouchMove"
  >
    <button
      class="app-footer__handle"
      type="button"
      aria-label="Toggle footer"
      @click="toggleFooter"
    />
    <Footer />
  </div>

  <button
    v-if="showFooterFab"
    class="app-footer__fab"
    :class="{ 'app-footer__fab--footer-open': footerVisible }"
    type="button"
    aria-label="Show footer"
    @click="toggleFooter"
  >
    <i
      :class="[
        'mdi',
        footerVisible ? 'mdi-chevron-down' : 'mdi-chevron-up',
        'text-[18px]',
      ]"
      aria-hidden="true"
    />
  </button>
</template>

<script setup>
import NavBar from "~/components/NavBar.vue";
import { computed, nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { usePresenceStore2 } from "@/stores/presenceStore2";
import { useMessagesStore } from "@/stores/messagesStore";
import { useDb } from "@/composables/useDB";
import { usePrimaryNavigation } from "@/composables/usePrimaryNavigation";
import { useResponsiveDisplay } from "@/composables/useResponsiveDisplay";
import { useFooterVisibility } from "~/composables/useFooterVisibility";
import { useHead, useRoute, useRuntimeConfig, useSiteConfig } from "#imports";
import { useFavoriteNotifications } from "@/composables/useFavoriteNotifications";
import { useUpvoteNotifications } from "@/composables/useUpvoteNotifications";
import { FOOTER_TOGGLE_ROUTE_PATHS } from "@/constants/footerLinks";
import { landingPageSlugs } from "@/config/landingPageSlugs";

const auth = useAuthStore();
const presence = usePresenceStore2();
const messages = useMessagesStore();
const runtimeConfig = useRuntimeConfig();
const siteConfig = useSiteConfig();
const { updateLastActive, touchPresence } = useDb();
const { primaryNavItems } = usePrimaryNavigation();
const { smAndDown } = useResponsiveDisplay();
const hasMounted = ref(false);
const route = useRoute();
const {
  isVisible: footerVisible,
  showFooter,
  hideFooter,
  setTouchStart,
  handleTouchMove,
  peekOffset,
} = useFooterVisibility();

useFavoriteNotifications();
useUpvoteNotifications();

const isClient = typeof window !== "undefined";
const isMobile = computed(() => hasMounted.value && smAndDown.value === true);
const localeSegmentPattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const normalizedPath = computed(() => {
  const rawPath = (route.path || "").split("?")[0];
  const segments = rawPath.split("/").filter(Boolean);
  if (!segments.length) return "/";
  const withoutLocale = localeSegmentPattern.test(segments[0])
    ? segments.slice(1)
    : segments;
  return `/${withoutLocale.join("/")}`.replace(/\/+$/, "") || "/";
});
const isChatRoute = computed(() => normalizedPath.value.startsWith("/chat"));
const isProfilesRoute = computed(() =>
  normalizedPath.value.startsWith("/profiles")
);
const isFeedsRoute = computed(() => normalizedPath.value.startsWith("/feeds"));
const isMatchRoute = computed(() => normalizedPath.value.startsWith("/match"));
const isLanguagePracticeRoute = computed(() =>
  normalizedPath.value.startsWith("/language-practice")
);
const isArticlesRoute = computed(() =>
  normalizedPath.value.startsWith("/articles")
);
const isTaxonomyRoute = computed(
  () =>
    normalizedPath.value.startsWith("/categories") ||
    normalizedPath.value.startsWith("/tags") ||
    normalizedPath.value.startsWith("/people")
);
const isSettingsRoute = computed(() =>
  normalizedPath.value.startsWith("/settings")
);
const isAdminRoute = computed(() => normalizedPath.value.startsWith("/admin"));
const isHomeRoute = computed(() => {
  return normalizedPath.value === "/";
});
const isRootLandingRoute = computed(() =>
  landingPageSlugs.some((slug) => normalizedPath.value === `/${slug}`)
);
const isInlineFooterRoute = computed(() =>
  isRootLandingRoute.value ||
  normalizedPath.value === "/faq" ||
  normalizedPath.value.startsWith("/faq/") ||
  ["/guides/", "/topics/", "/compare/"].some((prefix) =>
    normalizedPath.value.startsWith(prefix)
  )
);
const isFooterLinkRoute = computed(() =>
  FOOTER_TOGGLE_ROUTE_PATHS.includes(normalizedPath.value)
);
const useInlineFooter = computed(() => isInlineFooterRoute.value);
const footerToggleEnabled = computed(
  () =>
    !useInlineFooter.value &&
    (
      isChatRoute.value ||
      isHomeRoute.value ||
      isProfilesRoute.value ||
      isFooterLinkRoute.value ||
      isArticlesRoute.value ||
      isTaxonomyRoute.value ||
      isFeedsRoute.value ||
      isMatchRoute.value ||
      isLanguagePracticeRoute.value ||
      isSettingsRoute.value ||
      isAdminRoute.value
    )
);
const desktopChatFooter = computed(() => isChatRoute.value && !isMobile.value);
const desktopFooterToggleEnabled = computed(
  () => !isMobile.value && footerToggleEnabled.value
);
const hideFooterForActiveChat = computed(
  () =>
    isChatRoute.value &&
    ["anon_authenticated", "authenticated"].includes(auth.authStatus)
);
const showAppFooter = computed(() => !hideFooterForActiveChat.value);

const footerRef = ref(null);
const footerHeight = ref(80);
let footerResizeObserver = null;

onMounted(() => {
  if (typeof ResizeObserver === "undefined") return;
  footerResizeObserver = new ResizeObserver(() => {
    const el = footerRef.value;
    if (el) footerHeight.value = el.offsetHeight || 80;
  });
  watch(
    footerRef,
    (el, previousEl) => {
      if (previousEl) footerResizeObserver?.unobserve(previousEl);
      if (el) {
        footerHeight.value = el.offsetHeight || 80;
        footerResizeObserver?.observe(el);
      }
    },
    { immediate: true }
  );
});

onBeforeUnmount(() => {
  footerResizeObserver?.disconnect();
});

const mainStyle = computed(() => {
  const isChat = isChatRoute.value;
  const base = {
    paddingTop: isChat
      ? "calc(var(--nav2-offset, 78px) + 6px)"
      : "var(--nav2-offset, 0px)",
  };
  if (!isMobile.value) {
    if (!showAppFooter.value) return base;
    if (useInlineFooter.value) return base;
    if (!desktopFooterToggleEnabled.value) return base;
    return {
      ...base,
      paddingBottom: footerVisible.value ? `${footerHeight.value}px` : "0px",
      transition: "padding-bottom 160ms ease",
    };
  }
  if (!showAppFooter.value) {
    return {
      ...base,
      paddingBottom: "0px",
      transition: "padding-bottom 160ms ease",
    };
  }
  if (useInlineFooter.value) {
    return {
      ...base,
      paddingBottom: "0px",
      transition: "padding-bottom 160ms ease",
    };
  }
  const padding = footerVisible.value
    ? footerHeight.value
    : isChat
      ? 0
      : peekOffset + 12;
  return {
    ...base,
    paddingBottom: `calc(${padding}px + env(safe-area-inset-bottom, 0px))`,
    transition: "padding-bottom 160ms ease",
  };
});

const onFooterTouchStart = (e) => {
  if (!isMobile.value) return;
  const t = e.touches?.[0];
  if (!t) return;
  setTouchStart("footer", t.clientY);
};

const onFooterTouchMove = (e) => {
  if (!isMobile.value) return;
  const t = e.touches?.[0];
  if (!t) return;
  handleTouchMove("footer", t.clientY);
};

const toggleFooter = () => {
  if (footerVisible.value) hideFooter();
  else showFooter();
};

const shouldCollapseFooterByDefault = computed(
  () =>
    isChatRoute.value ||
    (!isMobile.value && footerToggleEnabled.value) ||
    (isMobile.value && isLanguagePracticeRoute.value)
);

// Chat route: collapse footer on both mobile and desktop.
// Language practice: collapse by default on mobile to keep filters and cards reachable.
watch(shouldCollapseFooterByDefault, (shouldCollapse) => {
  if (shouldCollapse) hideFooter();
  else showFooter();
}, { immediate: true });

// Also collapse when resizing to large screen while already on chat route
watch(desktopFooterToggleEnabled, (active) => {
  if (active) hideFooter();
});

const showFooterFab = computed(
  () =>
    showAppFooter.value &&
    (desktopFooterToggleEnabled.value || (isMobile.value && footerToggleEnabled.value))
);
const unreadCount = computed(() => messages.totalUnread || 0);
const unreadLabel = computed(() =>
  unreadCount.value > 99 ? "99+" : `${unreadCount.value}`
);
const siteUrl = computed(() =>
  String(siteConfig?.url || runtimeConfig.public.SITE_URL || "").replace(/\/+$/, "")
);
const ACTIVITY_AUTH_STATUSES = ["anon_authenticated", "authenticated"];
let lastNavPingAt = 0;

const clearOrphanedOverlays = () => {
  if (!isClient) return;
  const overlays = document.querySelectorAll(".v-overlay");
  overlays.forEach((overlay) => {
    const isActive = overlay.classList.contains("v-overlay--active");
    if (!isActive) return;
    const contents = Array.from(overlay.querySelectorAll(".v-overlay__content"));
    const hasVisibleContent = contents.some((el) => el.offsetParent !== null);
    // Active scrim with no visible content is stale and can dim the page indefinitely.
    if (!hasVisibleContent) {
      overlay.remove();
    }
  });
};

const touchLastActive = async () => {
  if (!isClient) return;
  if (!ACTIVITY_AUTH_STATUSES.includes(auth.authStatus)) return;
  const userId = auth.user?.id;
  if (!userId) return;

  const now = Date.now();
  if (now - lastNavPingAt < 2 * 60 * 1000) return;
  lastNavPingAt = now;
  try {
    await updateLastActive(userId);
  } catch {}
};

onMounted(() => {
  hasMounted.value = true;
});

watch(
  () => route.fullPath,
  () => {
    touchLastActive();
    nextTick(() => {
      clearOrphanedOverlays();
    });
  },
  { immediate: true }
);

onMounted(() => {
  watch(
    () => auth.user?.id,
    async (id) => {
      if (!id) {
        await messages.dispose?.();
        return;
      }
      await messages.init(id);
    },
    { immediate: true }
  );
});

useHead(() => ({
  titleTemplate: (titleChunk) => {
    const stripped = (titleChunk || "").replace(/ ?\| ?ImChatty$/i, "").trim();
    const base = stripped || "ImChatty";
    const prefix = unreadCount.value > 0 ? `(${unreadLabel.value}) ` : "";
    return stripped ? `${prefix}${base} | ImChatty` : "ImChatty";
  },
}));

useHead(() => {
  const base = siteUrl.value;
  const toAbsoluteUrl = (path) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    if (!base) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    return `${base}${normalized === "/" ? "" : normalized}`;
  };

  const navEntries = primaryNavItems.value
    .map((item) => ({
      name: item.name,
      url: toAbsoluteUrl(item.path),
    }))
    .filter((item) => item.url);

  return {
    script: [
      {
        key: "ld-primary-navigation",
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              "@id": base ? `${base}/#website` : undefined,
              url: base || undefined,
              name: siteConfig?.name || "ImChatty",
            },
            {
              "@type": "Organization",
              "@id": base ? `${base}/#organization` : undefined,
              name: "ImChatty",
              url: base || "https://imchatty.com",
              logo: {
                "@type": "ImageObject",
                url: "https://imchatty.com/images/robot.png",
              },
              sameAs: [
                "https://twitter.com/imchatty_news",
              ],
            },
            {
              "@type": "SiteNavigationElement",
              name: "Primary Navigation",
              hasPart: navEntries.map((entry) => ({
                "@type": "WebPage",
                name: entry.name,
                url: entry.url,
              })),
            },
          ],
        }),
      },
    ],
  };
});

onMounted(() => {
  if (!isClient) return;
  let baseHref = "";
  let baseImage = null;
  let loadPromise = null;

  const getLink = () => {
    let link = document.querySelector('link[rel~="icon"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    if (!baseHref) {
      baseHref = link.href || "/favicon.ico";
    }
    return link;
  };

  const loadBase = () => {
    if (baseImage) return Promise.resolve(baseImage);
    if (loadPromise) return loadPromise;
    loadPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        baseImage = img;
        resolve(img);
      };
      img.onerror = () => resolve(null);
      img.src = baseHref;
    });
    return loadPromise;
  };

  const drawBadge = async (count) => {
    const link = getLink();
    if (!count || count <= 0) {
      link.href = baseHref;
      return;
    }
    const img = await loadBase();
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (img) ctx.drawImage(img, 0, 0, size, size);

    const badge = unreadLabel.value;
    const radius = 18;
    const x = size - radius;
    const y = radius;
    ctx.fillStyle = "#ff3b30";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(badge, x, y + 1);

    link.href = canvas.toDataURL("image/png");
  };

  watch(
    () => unreadCount.value,
    (count) => {
      drawBadge(count);
    },
    { immediate: true }
  );
});

watch(
  () => isMobile.value,
  (isMobileNow) => {
    if (!isMobileNow) {
      showFooter();
    }
  }
);

// --- tiny UI helpers ---
const rebuildNow = () => presence?._rebuild?.(presence?.channel);
const rebuildSoon = () => queueMicrotask(() => rebuildNow());

// Optional observer heartbeat (SSR safe)
let heartbeat = null;
const startHeartbeat = () => {
  if (!isClient) return;
  if (!heartbeat) heartbeat = window.setInterval(rebuildNow, 1500);
};
const stopHeartbeat = () => {
  if (heartbeat) {
    window.clearInterval(heartbeat);
    heartbeat = null;
  }
};

let presenceTouchTimer = null;
const startPresenceTouch = (userId) => {
  if (!isClient || !userId) return;
  if (presenceTouchTimer) clearInterval(presenceTouchTimer);
  touchPresence(userId);
  presenceTouchTimer = window.setInterval(
    () => touchPresence(userId),
    60 * 1000
  );
};
const stopPresenceTouch = () => {
  if (presenceTouchTimer) {
    window.clearInterval(presenceTouchTimer);
    presenceTouchTimer = null;
  }
};

// ---------- SINGLE-FLIGHT, IDEMPOTENT WIRING ----------
let wireInflight = null; // Promise | null
let lastModeKey = null; // "user:<id>" | "observer"

function currentModeKey() {
  const ch = presence.channel;
  const k = presence.presenceKey;
  if (!ch) return null;
  if (k && String(k).startsWith("observer:")) return "observer";
  if (k) return `user:${k}`;
  return null;
}

async function setPresenceForUserId(userId) {
  if (!isClient) return;

  // Decide desired mode
  const desired = userId ? `user:${String(userId)}` : "observer";

  // Fast no-op: already in desired mode and joined/joining
  const ch = presence.channel;
  if (ch && (ch.state === "joined" || ch.state === "joining")) {
    const cur = currentModeKey();
    if (cur === desired) return;
  }

  // Collapse concurrent calls into one
  if (wireInflight) {
    // Wait for active wiring to finish, then re-check desired mode once
    await wireInflight;
    const ch2 = presence.channel;
    const cur2 =
      ch2 && (ch2.state === "joined" || ch2.state === "joining")
        ? currentModeKey()
        : null;
    if (cur2 === desired) return;
  }

  // Single flight
  wireInflight = (async () => {
    try {
      // Leave whatever existed (idempotent in store)
      await presence.leave().catch(() => {});

      if (desired === "observer") {
        await presence.observe(); // creates fresh observer channel
        startHeartbeat();
        stopPresenceTouch();
      } else {
        const id = desired.slice("user:".length);
        await presence.connect({ userId: id }); // creates fresh tracked channel
        stopHeartbeat();
        startPresenceTouch(id);
      }

      lastModeKey = desired;
      rebuildSoon();
    } catch (e) {
      console.warn("[presence wire error]", e);
    }
  })();

  try {
    await wireInflight;
  } finally {
    wireInflight = null;
  }
}

// ---------- PASSIVE LIFECYCLE (no mode switching here) ----------
function onVisibility() {
  if (!isClient) return;
  if (document.visibilityState !== "visible") return;
  if (auth.user?.id && presence.channel?.state === "joined") {
    presence._trackNow?.(); // refresh our own meta
  }
  rebuildSoon();
}
function onOnline() {
  rebuildSoon();
}
function onOffline() {
  rebuildSoon();
}

// ---------- BOOT ----------
onMounted(async () => {
  // Expose for console
  // const sb = useDb().getClient();
  // window.a = auth;
  // window.p = presence;
  // window.c = sb;
  // window.sb = sb;

  // This may be called by multiple places; it's ok
  await auth.checkAuth?.();

  document.addEventListener("visibilitychange", onVisibility, {
    passive: true,
  });
  window.addEventListener("online", onOnline, { passive: true });
  window.addEventListener("offline", onOffline, { passive: true });
});

onBeforeUnmount(() => {
  document.removeEventListener("visibilitychange", onVisibility);
  window.removeEventListener("online", onOnline);
  window.removeEventListener("offline", onOffline);
  stopHeartbeat();
  stopPresenceTouch();
});

// ---------- SINGLE SOURCE OF TRUTH ----------
if (isClient) {
  // Runs on mount and whenever auth.user?.id changes (guest ↔ anon/auth)
  watch(
    () => auth.user?.id,
    async (me) => {
      await setPresenceForUserId(me || null);
    },
    { immediate: true }
  );

  // Keep passive: do not switch presence here even if multiple checkAuth fire.
  watch(
    () => auth.authStatus,
    () => {
      rebuildSoon();
    },
    { immediate: false }
  );
}
</script>

<style>
.app-main {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
}

.app-footer {
  transition: transform 160ms ease, opacity 160ms ease;
  background: rgb(var(--color-surface)) !important;
  background-color: rgb(var(--color-surface)) !important;
  border-top: 0;
  flex: 0 0 auto;
  min-height: 0;
  height: auto;
  width: 100%;
  padding: 0;
}

.app-footer--inline {
  position: static;
}

.app-footer--desktop.app-footer--toggleable {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1100;
}

.app-footer--chat {
  background: #0f172a !important;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

.app-footer--feeds {
  background: #0f172a !important;
  border-top: 1px solid rgba(148, 163, 184, 0.24);
}

.app-footer--hidden {
  transform: translateY(calc(100% - 14px));
}

.app-footer--desktop.app-footer--hidden {
  transform: translateY(100%);
}

.app-footer--desktop .compact-footer {
  box-shadow: 0 -6px 24px rgb(var(--color-shadow) / 0.12);
}

.app-footer--collapsible {
  overflow: hidden;
  max-height: 120px;
  transition: max-height 200ms ease, transform 160ms ease;
}

.app-footer--collapsible.app-footer--hidden {
  max-height: 0;
  transform: none;
}

.app-footer__handle {
  display: none;
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  width: 54px;
  height: 7px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.75);
  border: none;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(2, 6, 23, 0.45);
  transition: background-color 120ms ease, transform 120ms ease;
}

.app-footer--mobile .app-footer__handle {
  display: block;
}

.app-footer__handle:focus-visible {
  outline: 2px solid rgb(var(--color-primary));
}

.app-footer__handle:hover {
  background: rgba(203, 213, 225, 0.95);
  transform: translateX(-50%) scale(1.03);
}

.app-footer__fab {
  position: fixed;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  width: 24px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.55);
  color: rgba(226, 232, 240, 0.85);
  box-shadow: 0 4px 10px rgba(2, 6, 23, 0.22);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1300;
}

.app-footer__fab--footer-open {
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
}

html.dark .profiles-route-main,
html[data-imchatty-theme="dark"] .profiles-route-main {
  background: #0f172a;
}

html.dark .app-main,
html[data-imchatty-theme="dark"] .app-main {
  background: #0f172a;
}

.chat-route-main {
  background: #0f172a;
}

.feeds-route-main {
  background: #0f172a;
}

.match-route-main {
  background: #0f172a;
}

.admin-route-main {
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
}

.root-landing-route-main {
  flex: 0 0 auto;
  min-height: auto;
}

.inline-footer-route-main {
  flex: 0 0 auto;
  min-height: auto;
}

@media (max-width: 960px) {
  .app-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
    padding: 0;
    background: rgb(var(--color-surface));
    min-height: 52px;
    max-height: none;
    overflow: visible;
  }

   .app-footer--inline {
    position: static;
    min-height: 0;
    overflow: visible;
  }

  .app-footer .compact-footer {
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -6px 24px rgb(var(--color-shadow) / 0.12);
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  }

  .app-footer--inline .compact-footer {
    border-radius: 12px;
    box-shadow: none;
    padding-bottom: 0;
  }

  .app-footer--mobile .compact-footer__content {
    white-space: normal;
    overflow: visible;
    display: flex;
  }

  .app-footer__handle {
    display: block;
  }
}

html.dark .app-footer,
html[data-imchatty-theme="dark"] .app-footer {
  background: #141923 !important;
  border-top-color: transparent;
}
</style>
