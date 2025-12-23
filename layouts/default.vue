<template>
  <NavBar />
  <!-- Main content; let children shrink to create scroll areas -->
  <v-main class="d-flex flex-column min-h-0" :style="mainStyle">
    <!-- Optional container; keep min-h-0 so inner flex can shrink -->
    <v-container
      fluid
      class="d-flex flex-column flex-grow-1 min-h-0 pa-0 px-sm-6"
    >
      <!-- NuxtPage should be allowed to grow/shrink -->
      <div class="d-flex flex-column flex-grow-1 min-h-0">
        <NuxtPage />
      </div>
    </v-container>
  </v-main>

  <!-- FOOTER must be an app footer to reserve space -->
  <v-footer v-if="!isMobile" app elevation="0" class="app-footer">
    <Footer />
  </v-footer>

  <div
    v-else
    class="app-footer app-footer--mobile"
    :class="{ 'app-footer--hidden': !footerVisible }"
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
    type="button"
    aria-label="Show footer"
    @click="toggleFooter"
  >
    <v-icon size="18">
      {{ footerVisible ? "mdi-chevron-down" : "mdi-chevron-up" }}
    </v-icon>
  </button>
</template>

<script setup>
import NavBar from "~/components/NavBar.vue";
import { computed, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { usePresenceStore2 } from "@/stores/presenceStore2";
import { useMessagesStore } from "@/stores/messagesStore";
import { useDb } from "@/composables/useDB";
import { useDisplay } from "vuetify";
import { useFooterVisibility } from "~/composables/useFooterVisibility";
import { useHead, useRoute } from "#imports";

const auth = useAuthStore();
const presence = usePresenceStore2();
const messages = useMessagesStore();
const { smAndDown } = useDisplay();
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

const isClient = typeof window !== "undefined";
const isMobile = computed(() => hasMounted.value && smAndDown.value === true);
const isChatRoute = computed(() => (route.path || "").includes("/chat"));
const mainStyle = computed(() => {
  const base = {
    paddingTop: "var(--nav2-offset, 0px)",
  };
  if (!isMobile.value) return base;
  const padding = footerVisible.value ? 64 : peekOffset + 12;
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
  if (!isMobile.value) return;
  if (footerVisible.value) hideFooter();
  else showFooter();
};

const showFooterFab = computed(() => isMobile.value && isChatRoute.value);
const unreadCount = computed(() => messages.totalUnread || 0);
const unreadLabel = computed(() =>
  unreadCount.value > 99 ? "99+" : `${unreadCount.value}`
);

onMounted(() => {
  hasMounted.value = true;
});

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
    const base = titleChunk || "ImChatty";
    const prefix = unreadCount.value > 0 ? `(${unreadLabel.value}) ` : "";
    return `${prefix}${base}`;
  },
}));

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
      } else {
        const id = desired.slice("user:".length);
        await presence.connect({ userId: id }); // creates fresh tracked channel
        stopHeartbeat();
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
.app-footer {
  transition: transform 160ms ease, opacity 160ms ease;
}

.app-footer--hidden {
  transform: translateY(calc(100% - 14px));
}

.app-footer__handle {
  display: none;
  position: absolute;
  top: 2px;
  left: 50%;
  transform: translateX(-50%);
  width: 34px;
  height: 5px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.18);
  border: none;
  cursor: pointer;
  transition: background-color 120ms ease;
}

.app-footer--mobile .app-footer__handle {
  display: block;
}

.app-footer__handle:focus-visible {
  outline: 2px solid var(--v-theme-primary);
}

.app-footer__handle:hover {
  background: rgba(0, 0, 0, 0.28);
}

.app-footer__fab {
  position: fixed;
  right: 12px;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: none;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.6);
  box-shadow: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 1200;
}

@media (max-width: 960px) {
  .app-footer {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 1100;
    padding: 0;
    background: transparent;
  }

  .app-footer .compact-footer {
    border-radius: 12px 12px 0 0;
    box-shadow: 0 -6px 24px rgba(0, 0, 0, 0.08);
    padding-bottom: calc(8px + env(safe-area-inset-bottom, 0px));
  }

  .app-footer__handle {
    display: block;
  }
}
</style>
