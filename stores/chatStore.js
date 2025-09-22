import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { useDb } from "@/composables/useDB";
import { useMessagesStore } from "@/stores/messagesStore";
import { useAuthStore } from "@/stores/authStore1";
import { useAiQuota } from "~/composables/useAiQuota";

const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
const LS_KEY = "lastSelectedUserId";

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
          avatar_url: "/images/imchatty-avatar.png",
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

  // ——— actions ———
  async function fetchChatUsers() {
    loading.value = true;
    error.value = null;
    try {
      const { data, error: dbError } = await db.getAllProfiles();
      if (dbError) throw dbError;
      users.value = Array.isArray(data) ? data : [];
      ensureImchattyPresent();

      if (!selectedUser.value) {
        const restored = restoreSelectedUser();
        if (!restored) {
          // keep default behavior; initializeDefaultUser will set a default later
        }
      } else {
        const id = getStableId(selectedUser.value);
        const rebound = id ? getUserById(id) : null;
        if (rebound) selectedUser.value = rebound;
      }
    } catch (err) {
      console.error("[chatStore] fetchChatUsers error:", err);
      error.value = err;
    } finally {
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

  async function fetchActiveChats() {
    try {
      const { data, error: dbError } = await db.getActiveChats();
      if (dbError) throw dbError;
      const ids = normalizeActiveIds(data);
      activeChats.value = ids;
    } catch (err) {
      console.error("[chatStore] fetchActiveChats error:", err);
    }
  }

  // Decide who to select after users are loaded; does NOT stomp an existing selection */

  function initializeDefaultUser(authStatus) {
    if (selectedUser.value) return; // keep current selection
    if (!users.value.length) return;

    if (["unauthenticated", "guest", "onboarding"].includes(authStatus)) {
      selectImchatty();
      return;
    }
    const restored = restoreSelectedUser();
    if (!restored) selectImchatty();
  }

  //  addActivePeer API (can be used by callers too)
  function addActivePeer(peerId) {
    const id = String(peerId || "");
    if (!id) return;
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
        const me = String(auth.user?.id || "");
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

  // Optional: if the users list changes later (presence reload, pagination), rebind selectedUser to fresh object
  watch(users, () => {
    if (!selectedUser.value) return;
    const id = getStableId(selectedUser.value);
    const rebound = id ? getUserById(id) : null;
    if (rebound) selectedUser.value = rebound;
  });

  // Optional: re-assert selection when tab regains focus
  if (isClient()) {
    const onFocus = () => {
      if (!selectedUser.value) {
        const last = localStorage.getItem(LS_KEY);
        if (last) {
          const found = getUserById(last);
          if (found) selectedUser.value = found;
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
