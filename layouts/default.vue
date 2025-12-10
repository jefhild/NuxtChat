<template>
  <!-- <NavBar /> -->
  <NavBar_Test />
  <!-- Main content; let children shrink to create scroll areas -->
  <v-main class="d-flex flex-column min-h-0">
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
  <v-footer app elevation="0">
    <Footer />
  </v-footer>
</template>

<script setup>
import NavBar_Test from "@/components/NavBar_Test.vue";
import { onMounted, onBeforeUnmount, watch } from "vue";
import { useAuthStore } from "@/stores/authStore1";
import { usePresenceStore2 } from "@/stores/presenceStore2";
import { useDb } from "@/composables/useDB";

const auth = useAuthStore();
const presence = usePresenceStore2();

const isClient = typeof window !== "undefined";

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
/* optional global styles */
</style>
