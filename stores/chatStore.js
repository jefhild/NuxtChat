import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDb } from "@/composables/useDB";
import { useMessagesStore } from "@/stores/messagesStore";
import { useAuthStore } from "@/stores/authStore1";
import { useAiQuota } from "~/composables/useAiQuota";

const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
const IMCHATTY_SLUG = "imchatty";
const LS_KEY = "lastSelectedUserId";
const PREAUTH_STATUSES = ["anonymous", "unauthenticated", "guest", "onboarding"];
const RESUME_CHAT_STATUSES = ["authenticated", "anon_authenticated"];

export const useChatStore = defineStore("chatStore", () => {
  const users = ref([]); // directory (real + AI)
  const activeChats = ref([]); // array of peer IDs (strings)
  const loading = ref(false);
  const error = ref(null);
  const selectedUser = ref(null);
  const db = useDb();
  // const { tryConsume } = useAiQuota();

  // (for realtime watcher)
  const msgs = useMessagesStore();
  const auth = useAuthStore();
  const activeWatcherReady = ref(false);

  const isClient = () => typeof window !== "undefined";
  const getStableId = (u) =>
    u?.user_id || u?.id ? String(u.user_id || u.id) : null;
  const normalizeId = (v) => String(v ?? "").trim();
  const getStableSlug = (u) =>
    String(u?.slug ?? u?.profile_slug ?? u?.username_slug ?? "")
      .trim()
      .toLowerCase();
  const isImchatty = (u) =>
    getStableId(u) === IMCHATTY_ID || getStableSlug(u) === IMCHATTY_SLUG;
  const canUseHoneyBots = () => auth.authStatus !== "authenticated";
  const isHiddenHoneyForCurrentAuth = (u) => {
    if (!u?.is_ai || isImchatty(u)) return false;
    return !!u?.honey_enabled && !canUseHoneyBots();
  };
  const isInactiveAiUser = (u) => {
    if (!u?.is_ai) return false;
    // Treat any explicit false flag as inactive; missing flags default to active.
    return [u.is_active, u.ai_is_active, u.persona_is_active, u.persona?.is_active].some(
      (flag) => flag === false
    );
  };
  const filterActiveAiUsers = (list = []) =>
    (Array.isArray(list) ? list : []).filter((u) => !isInactiveAiUser(u));

  async function fetchPublicAiPersonaMap() {
    try {
      const res = await $fetch("/api/ai-personas");
      const personas = Array.isArray(res?.data) ? res.data : [];
      const map = new Map();
      for (const persona of personas) {
        const userId = normalizeId(persona?.profile?.user_id);
        if (!userId) continue;
        map.set(userId, {
          persona_key: persona?.persona_key || null,
          editorial_enabled: !!persona?.editorial_enabled,
          counterpoint_enabled: !!persona?.counterpoint_enabled,
          honey_enabled: !!persona?.honey_enabled,
          language_practice_enabled: !!persona?.language_practice_enabled,
          honey_delay_min_ms: Number(persona?.honey_delay_min_ms ?? 0),
          honey_delay_max_ms: Number(persona?.honey_delay_max_ms ?? 0),
          list_publicly:
            typeof persona?.list_publicly === "boolean"
              ? persona.list_publicly
              : true,
        });
      }
      return { loaded: true, map };
    } catch (err) {
      console.warn("[chatStore] fetchPublicAiPersonaMap failed:", err);
      return { loaded: false, map: new Map() };
    }
  }

  function ensureImchattyPresent() {
    const exists = users.value.some((u) => getStableId(u) === IMCHATTY_ID);
    if (!exists) {
      users.value = [
        {
          id: IMCHATTY_ID,
          user_id: IMCHATTY_ID,
          is_ai: true,
          displayname: "ImChatty",
          tagline: "Your helpful guide",
          gender_id: 3,
          avatar_url: "/images/robot.png",
        },
        ...users.value,
      ];
    }
  }

  function getUserById(userId) {
    const id = String(userId ?? "");
    return users.value.find((u) => getStableId(u) === id);
  }

  /** Persist + set selection (accepts user object OR id) */
  function setSelectedUser(input) {
    const user = typeof input === "object" ? input : getUserById(input);
    selectedUser.value = user || null;
    if (isClient()) {
      const id = getStableId(user) || "";
      localStorage.setItem(LS_KEY, id);
    }
  }

  /** Clear selection + persistence */
  function clearSelectedUser() {
    selectedUser.value = null;
    if (isClient()) localStorage.removeItem(LS_KEY);
  }

function isAiUser(u) {
  if (!u) return false;
  const id = getStableId(u);
  return !!u.is_ai || id === IMCHATTY_ID; // future: extend with a Set of bot IDs
}

function isAiId(id) {
  const u = getUserById(id);
  return isAiUser(u);
}


  /** Try to restore selection from localStorage using current users list */
  function restoreSelectedUser() {
    if (!isClient()) return false;
    const last = localStorage.getItem(LS_KEY);
    if (!last) return false;
    const found = getUserById(last);
    if (found && isHiddenHoneyForCurrentAuth(found)) {
      localStorage.removeItem(LS_KEY);
      return false;
    }
    if (found) {
      selectedUser.value = found;
      return true;
    }
    return false;
  }

  function selectImchatty() {
    const bot = getUserById(IMCHATTY_ID);
    if (bot) setSelectedUser(bot);
  }

  function selectMostRecentActiveChat() {
    const recentPeerId = (Array.isArray(activeChats.value) ? activeChats.value : []).find(
      (peerId) => {
        const peer = getUserById(peerId);
        return peer && !isHiddenHoneyForCurrentAuth(peer);
      }
    );
    if (!recentPeerId) return false;

    const recentPeer = getUserById(recentPeerId);
    if (!recentPeer) return false;

    setSelectedUser(recentPeer);
    return true;
  }

  // ——— actions ———
  async function fetchChatUsers() {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: dbError } = await db.getAllProfiles();
      // console.log('[chatStore] fetchChatUsers: fetched data len =', Array.isArray(data) ? data.length : 'n/a');
      if (dbError) throw dbError;
      let nextUsers = filterActiveAiUsers(data);
      const canSeeHoneyBots = auth.authStatus !== "authenticated";
      const { loaded: personaLoaded, map: personaMap } =
        await fetchPublicAiPersonaMap();
      nextUsers = nextUsers
        .map((u) => {
          if (!u?.is_ai) return u;
          if (isImchatty(u)) {
            return {
              ...u,
              list_publicly: true,
              counterpoint_enabled:
                typeof u.counterpoint_enabled === "boolean"
                  ? u.counterpoint_enabled
                  : true,
              honey_enabled:
                typeof u.honey_enabled === "boolean" ? u.honey_enabled : false,
              editorial_enabled:
                typeof u.editorial_enabled === "boolean"
                  ? u.editorial_enabled
                  : true,
            };
          }
          const key = normalizeId(getStableId(u));
          const persona = personaMap.get(key);
          if (!persona) return { ...u, list_publicly: false };
          return { ...u, ...persona };
        })
        .filter((u) => {
          if (!u?.is_ai) return true;
          if (isImchatty(u)) return true;
          if (!personaLoaded) return true;
          return u.list_publicly !== false;
        })
        .filter((u) => {
          if (!u?.is_ai) return true;
          if (isImchatty(u)) return true;
          if (!u.honey_enabled) return true;
          return canSeeHoneyBots;
        });
      const userIds = nextUsers.map((u) => u?.user_id).filter(Boolean);
      if (userIds.length && db.getProfileTranslationsForUsers) {
        try {
          const { data: translations } =
            await db.getProfileTranslationsForUsers(userIds);
          const map = new Map();
          (translations || []).forEach((row) => {
            const key = row.user_id;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(row);
          });
          nextUsers = nextUsers.map((u) => ({
            ...u,
            profile_translations: map.get(u.user_id) || [],
          }));
        } catch (err) {
          console.warn("[chatStore] translations failed:", err);
        }
      }
      users.value = nextUsers;
      ensureImchattyPresent();

      if (!selectedUser.value) {
        const restored = restoreSelectedUser();
        if (!restored) {
          // keep default behavior; initializeDefaultUser will set a default later
        }
      } else {
        const id = getStableId(selectedUser.value);
        const rebound = id ? getUserById(id) : null;
        if (rebound) {
          selectedUser.value = rebound;
        } else if (isInactiveAiUser(selectedUser.value)) {
          clearSelectedUser();
        }
      }
    } catch (err) {
      console.error("[chatStore] fetchChatUsers error:", err);
      error.value = err;
    } finally {
      ensureImchattyPresent();
      loading.value = false;
    }
  }

  // ✅ normalize DB result into array of string IDs
  function normalizeActiveIds(rows) {
    if (!Array.isArray(rows)) return [];
    return rows
      .map((r) => String(r?.peer_id ?? r?.user_id ?? r?.id ?? "")) // your RPC row shape
      .filter(Boolean);
  }

  // ✅ merge helper (put newest first, dedupe)
  function mergeActiveChatsHead(ids) {
    const set = new Set(activeChats.value);
    const merged = [...ids.filter((id) => !set.has(id)), ...activeChats.value];
    activeChats.value = merged;
  }

  async function fetchActiveChats(userId) {
    try {
      const { data, error: dbError } = await db.getActiveChats(userId);
      if (dbError) throw dbError;
      const ids = normalizeActiveIds(data);
      activeChats.value = ids;
      cleanupHiddenHoneyState();
    } catch (err) {
      console.error("[chatStore] fetchActiveChats error:", err);
    }
  }

  // Decide who to select after users are loaded; does NOT stomp an existing selection */

  function initializeDefaultUser(authStatus) {
    if (selectedUser.value) return; // keep current selection
    if (!users.value.length) return;

    if (PREAUTH_STATUSES.includes(authStatus)) {
      selectImchatty();
      return;
    }

    if (RESUME_CHAT_STATUSES.includes(authStatus)) {
      const resumed = selectMostRecentActiveChat();
      if (resumed) return;
    }

    const restored = restoreSelectedUser();
    if (restored) return;

    selectImchatty();
  }

  //  addActivePeer API (can be used by callers too)
  function addActivePeer(peerId) {
    const id = String(peerId || "");
    if (!id) return;
    const peer = getUserById(id);
    if (peer && isHiddenHoneyForCurrentAuth(peer)) return;
    if (!activeChats.value.includes(id)) {
      activeChats.value = [id, ...activeChats.value]; // newest first
    }
  }

  //  realtime watcher — merges new peers into activeChats instantly
  function initActiveChatsWatcher() {
    if (activeWatcherReady.value) return;
    activeWatcherReady.value = true;

    watch(
      () => msgs.incoming,
      (m) => {
        if (!m) return;
        const me = String(msgs._me || auth.user?.id || "");
        if (!me) return;

        const sender = String(m.sender_id || "");
        const receiver = String(m.receiver_id || "");
        if (!sender || !receiver) return;

        // if message involves me, mark the other party active
        if (sender === me) addActivePeer(receiver);
        else if (receiver === me) addActivePeer(sender);
      },
      { flush: "post" }
    );
  }

  function cleanupHiddenHoneyState() {
    if (canUseHoneyBots()) return;

    if (selectedUser.value && isHiddenHoneyForCurrentAuth(selectedUser.value)) {
      clearSelectedUser();
    }

    activeChats.value = activeChats.value.filter((peerId) => {
      const peer = getUserById(peerId);
      if (!peer) return true;
      return !isHiddenHoneyForCurrentAuth(peer);
    });

    if (!selectedUser.value) {
      const fallback =
        users.value.find((u) => isImchatty(u)) ||
        users.value.find((u) => !isHiddenHoneyForCurrentAuth(u));
      if (fallback) setSelectedUser(fallback);
    }
  }

  // Optional: if the users list changes later (presence reload, pagination), rebind selectedUser to fresh object
  watch(users, () => {
    if (selectedUser.value) {
      const id = getStableId(selectedUser.value);
      const rebound = id ? getUserById(id) : null;
      if (rebound) selectedUser.value = rebound;
    }
    cleanupHiddenHoneyState();
  });

  watch(
    () => auth.authStatus,
    () => {
      cleanupHiddenHoneyState();
    },
    { immediate: true }
  );

  // Optional: re-assert selection when tab regains focus
  if (isClient()) {
    const onFocus = () => {
      if (!selectedUser.value) {
        const last = localStorage.getItem(LS_KEY);
        if (last) {
          const found = getUserById(last);
          if (found && !isHiddenHoneyForCurrentAuth(found)) {
            selectedUser.value = found;
          }
        }
      }
    };
    window.addEventListener("focus", onFocus);
  }

  return {
    // state
    users,
    activeChats,
    loading,
    error,
    selectedUser,
    // helpers
    getUserById,
    addActivePeer, //  NEW (public)
    // actions
    fetchChatUsers,
    fetchActiveChats,
    setSelectedUser,
    clearSelectedUser,
    initializeDefaultUser,
    restoreSelectedUser,
    initActiveChatsWatcher, //  NEW (public)
  };
});
