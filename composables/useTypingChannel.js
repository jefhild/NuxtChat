// /composables/useTypingChannel.js
import { ref, watch, unref, isRef, onBeforeUnmount } from "vue";
import { useDb } from "@/composables/useDB";
import { useTypingStore } from "@/stores/typingStore";

// Cache: conversationKey -> { ch, listeners }
const channelCache = new Map();

export function useTypingChannel({ meId, peerId, conversationKey }) {
  const { getClient } = useDb();
  const client = getClient();
  const typing = useTypingStore();

  const meRef = isRef(meId) ? meId : ref(meId);
  const peerRef = isRef(peerId) ? peerId : ref(peerId);
  const keyRef = isRef(conversationKey)
    ? conversationKey
    : ref(conversationKey);

  let removeHandler = null;

  const mkChannel = (name, opts) =>
    typeof client.channel === "function"
      ? client.channel(name, opts)
      : client.realtime.channel(name, opts);

  function ensureEntry(key) {
    let entry = channelCache.get(key);
    if (!entry) {
      // ✅ typing channel: broadcast only; NO presence
      const ch = mkChannel(`typing:${key}`, {
        config: { broadcast: { self: false } },
      });
      entry = { ch, listeners: 0, __didSubscribe: false };
      channelCache.set(key, entry);
    }
    return entry;
  }

  async function ensureSubscribed(entry) {
    if (entry.__didSubscribe) return;
    entry.__didSubscribe = true;
    await new Promise((resolve) => {
      entry.ch.subscribe((status) => {
        if (status === "SUBSCRIBED") resolve();
      });
    });
  }

  async function attach(key, _me, _peer) {
    if (!import.meta.client || !_me || !_peer || !key) return;

    const entry = ensureEntry(key);
    await ensureSubscribed(entry);

    const handler = ({ payload }) => {
      const p = payload || {};
      if (p.from === String(_peer) && p.to === String(_me)) {
        typing.set(String(_peer), true);
        clearTimeout(handler._t);
        handler._t = setTimeout(() => typing.clear(String(_peer)), 1500);
      }
    };

    entry.ch.on("broadcast", { event: "typing" }, handler);
    entry.listeners += 1;

    removeHandler = () => {
      try {
        entry.ch.off("broadcast", { event: "typing" }, handler);
      } catch {}
      entry.listeners -= 1;
      if (entry.listeners <= 0) {
        // cleanly tear down the channel
        try {
          entry.ch.unsubscribe();
        } catch {}
        channelCache.delete(key);
      }
      removeHandler = null;
    };
  }

  async function detach() {
    if (removeHandler) removeHandler();
  }

  watch(
    [meRef, peerRef, keyRef],
    async ([m, p, k]) => {
      await detach();
      if (!m || !p || !k) return;
      await attach(String(k), String(m), String(p));
    },
    { immediate: true }
  );

  onBeforeUnmount(detach);

  // Optional: tiny throttle to avoid spamming
  let lastSent = 0;
  async function sendTypingPing() {
    const k = unref(keyRef);
    const m = unref(meRef);
    const p = unref(peerRef);
    if (!k || !m || !p) return;

    const now = Date.now();
    if (now - lastSent < 300) return; // throttle
    lastSent = now;

    const entry = ensureEntry(String(k));
    await ensureSubscribed(entry);

    await entry.ch.send({
      type: "broadcast",
      event: "typing",
      payload: { from: String(m), to: String(p), at: now },
    });
  }

  return { sendTypingPing };
}
