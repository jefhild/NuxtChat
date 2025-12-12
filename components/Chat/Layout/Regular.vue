<template>
  <!-- Regular3.vue template -->
  <div ref="wrapRef" class="d-flex flex-column h-100 overflow-hidden">
    <v-virtual-scroll
      ref="vsRef"
      :items="items"
      :item-height="itemHeight"
      :height="listHeight"
    >
      <template #default="{ item }">
        <template v-if="item._typing">
          <ChatLayoutTypingBubble />
        </template>
        <template v-else>
          <ChatLayoutChatBubble
            :from-me="item.sender_id === meId"
            :html="render(item.content)"
            :time="formatDisplayTime(item.created_at)"
            :name="item._name"
            :avatar="item._avatar"
            :show-meta="Boolean(item._name || item._avatar || item.created_at)"
          />
        </template>
      </template>
    </v-virtual-scroll>

  </div>
</template>

<script setup>
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from "vue";
import { useDb } from "@/composables/useDB";
import { useMessagesStore } from "@/stores/messagesStore";
import { useMarkdown } from "~/composables/useMarkdown";
import { useTypingStore } from "@/stores/typingStore";

const typingStore = useTypingStore();

const { init: initMd, render } = useMarkdown();

const props = defineProps({
  meId: { type: String, required: true },
  peer: { type: Object, default: null }, // should contain displayname/id
});

const db = useDb();
const msgs = useMessagesStore();

// ── state
const messages = ref([]);
const loading = ref(false);
const typing = ref(false); // 🔹 NEW: show typing chip

const peerName = computed(() => props.peer?.displayname || "");
const peerAvatar = computed(
  () => props.peer?.avatar_url || props.peer?.avatar || ""
);
const meName = "me";

function formatDisplayTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffMs = Math.max(0, now - date.getTime());
  const diffHours = diffMs / 36e5;

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const diffDays = Math.floor(diffMs / 864e5);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

const items = computed(() => {
  const base = (messages.value || []).map((m) => ({
    ...m,
    _name: m.sender_id === props.meId ? meName : peerName.value,
    _avatar: m.sender_id === props.meId ? "" : peerAvatar.value,
  }));
  return showTyping.value
    ? [...base, { _typing: true, id: `typing-${peerId.value}` }]
    : base;
});

const peerId = computed(() =>
  String(props.peer?.user_id || props.peer?.id || "")
);
const conversationKey = computed(() =>
  props.meId && peerId.value
    ? [String(props.meId), String(peerId.value)].sort().join(":")
    : null
);

useTypingChannel({
  meId: computed(() => props.meId),
  peerId,
  conversationKey,
});

const showTyping = computed(
  () => (!!peerId.value && typingStore.isTyping(peerId.value)) || typing.value
);

// ── Virtual scroll sizing
const wrapRef = ref(null);
const typingRef = ref(null);
const headerRef = ref(null);
const composerRef = ref(null);
const vsRef = ref(null);

const itemHeight = 72;
const listHeight = ref(420);

let roWrap, roHeader, roComposer;
function updateHeights() {
  // Make sure the outer parent of wrapRef has a fixed height (flex container with h-100 / min-h-0)
  // const wrapH = wrapRef.value?.clientHeight || 0;
  // const headerH = headerRef.value?.offsetHeight || 0;
  // const composerH = composerRef.value?.offsetHeight || 0;
  // const typingH = showTyping.value ? typingRef.value?.offsetHeight || 0 : 0; // 👈 NEW
  // const h = wrapH - headerH - composerH - typingH; // 👈 subtract the footer

  const wrapH = wrapRef.value?.clientHeight || 0
 const h = wrapH
  listHeight.value = Math.max(200, Math.round(h));
}

onMounted(() => {
  initMd();
  updateHeights();
  const mkRO = (el, cb) => {
    if (!el) return null;
    const ro = new ResizeObserver(cb);
    ro.observe(el);
    return ro;
  };
  roWrap = mkRO(wrapRef.value, updateHeights);
  roHeader = mkRO(headerRef.value, updateHeights);
  roComposer = mkRO(composerRef.value, updateHeights);
  window.addEventListener("resize", updateHeights);
});

onBeforeUnmount(() => {
  [roWrap, roHeader, roComposer].forEach((ro) => ro && ro.disconnect());
  window.removeEventListener("resize", updateHeights);
});

const scrollEl = () => (vsRef.value && vsRef.value.$el) || null;
const raf = () => new Promise((r) => requestAnimationFrame(r));
const scrollToBottom = async () => {
  await nextTick();
  await raf();
  await raf();
  const el = scrollEl();
  if (el) el.scrollTop = el.scrollHeight;
};
function isNearBottom(el, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

// ── Load thread
const loadThread = async () => {
  if (!props.meId || !peerId.value) {
    messages.value = [];
    typing.value = false; // clear typing when no peer
    return;
  }
  loading.value = true;
  try {
    const rows = await db.getMessagesBetweenUsers(
      props.meId,
      peerId.value,
      null,
      40
    );
    messages.value = rows || [];
    await scrollToBottom();
    await msgs.markThreadAsRead(peerId.value);
  } finally {
    loading.value = false;
  }
};
onMounted(loadThread);

onMounted(async () => {
  // Safe to call; your store will no-op if already wired
  await msgs.init(props.meId);
});

watch(() => peerId.value, loadThread);

// ── Expose functions parent can call
defineExpose({
  appendLocalAndSend,
  appendPeerLocal,
  setTyping, // 🔹 expose so parent/AI controller can toggle typing
  getLastMessages,
});

// 🔹 NEW: toggler to show/hide typing chip (call when you start/stop AI)
function setTyping(val, label) {
  typing.value = !!val;
  // you can optionally override label per call if you want
  if (typeof label === "string" && label) {
    // if you want dynamic labels, convert typingLabel to a ref and set here
    // keeping computed for now (from peer.displayname)
  }
}



// temp-append a peer (bot/other user) message
async function appendPeerLocal(text) {
  if (!text || !props.meId || !peerId.value) return;

  const temp = {
    _peerTempKey: `peer-tmp-${Date.now()}`,
    id: null,
    sender_id: peerId.value,   // ← pretend it came from the peer
    receiver_id: props.meId,
    content: text,
    created_at: new Date().toISOString(),
    read: false,
  };
  messages.value = [...messages.value, temp];
  await scrollToBottom();
}





// ── Sending my own message (unchanged)
async function appendLocalAndSend(text) {
  const meId = props.meId;
  if (!text || !meId || !peerId.value) return;

  const temp = {
    _tempKey: `tmp-${Date.now()}`,
    id: null,
    sender_id: meId,
    receiver_id: peerId.value,
    content: text,
    created_at: new Date().toISOString(),
    read: false,
  };
  messages.value = [...messages.value, temp];
  await scrollToBottom();

  const rows = await db.insertMessage(peerId.value, meId, text);
  if (Array.isArray(rows) && rows.length) {
    const idx = messages.value.findIndex((m) => m._tempKey === temp._tempKey);
    if (idx !== -1) messages.value[idx] = rows[0];
  }
}

// ── Helper for AI history (unchanged)
function getLastMessages(limit = 10, peer = props.peer) {
  const meId = String(props.meId || "");
  const peerName = peer?.displayname || "Bot";
  return (messages.value || []).slice(-limit).map((m) => ({
    sender: String(m.sender_id) === meId ? "You" : peerName,
    content: m.content ?? "",
  }));
}

watch(
  () => msgs.incoming,
  async (m) => {
    if (!m) return;

    // only for this open thread
    if (String(m.sender_id) !== peerId.value || String(m.receiver_id) !== props.meId) {
      return;
    }

    // once the real AI message arrives, stop typing chip
    typing.value = false;

    // Try to reconcile a peer temp message (avoid duplicates)
    const idx = messages.value.findIndex(
      x =>
        x._peerTempKey &&                // only our temp peers
        x.sender_id === m.sender_id &&
        x.receiver_id === m.receiver_id &&
        x.content === m.content          // simple heuristic
    );
    if (idx !== -1) {
      const copy = messages.value.slice();
      copy[idx] = m;                     // replace temp with server row
      messages.value = copy;
    } else {
      // no temp -> just append
      const el = scrollEl();
      const shouldStick = el ? isNearBottom(el) : true;
      messages.value = [...messages.value, m];
      if (shouldStick) await scrollToBottom();
    }

    await msgs.markThreadAsRead(peerId.value);
  }
);

// Keep list pinned on my own messages as before
watch(
  () => messages.value.length,
  async () => {
    const el = scrollEl();
    if (el && isNearBottom(el)) await scrollToBottom();
  }
);

// watch(
//   [() => props.meId, peerId, conversationKey],
//   ([m, p, k]) => {
//     console.log("[Regular3] me:", m, "peer:", p, "key:", k);
//   },
//   { immediate: true }
// );

watch(
  () => typingStore.typingByPeer,
  (t) => {
    console.log("[Regular3] store:", JSON.stringify(t));
  },
  { deep: true }
);
</script>

<style scoped>
.text-2xs {
  font-size: 11px;
}
.bg-surface-variant {
  background: rgba(0, 0, 0, 0.05);
}
.h-full {
  height: 100%;
}

.item {
  /* replace mb-2 with internal spacing */
  padding: 4px 0; /* vertical spacing between rows */
  /* optional: enforce a minimum height roughly matching itemHeight */
  min-height: 64px;
}
.vs-pad-bottom {
  padding-bottom: 24px;
}

.text-2xs {
  font-size: 11px;
}
.bg-surface-variant {
  background: rgba(0, 0, 0, 0.05);
}
.h-full {
  height: 100%;
}

.item {
  padding: 4px 0;
  min-height: 64px;
}
.vs-pad-bottom {
  padding-bottom: 24px;
}

/* 🔹 Typing chip */
.typing-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.06);
}
.typing-chip .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  display: inline-block;
  animation: blink 1.2s infinite;
}
.typing-chip .dot:nth-child(1) {
  animation-delay: 0s;
}
.typing-chip .dot:nth-child(2) {
  animation-delay: 0.15s;
}
.typing-chip .dot:nth-child(3) {
  animation-delay: 0.3s;
}
.typing-chip .typing-label {
  font-size: 12px;
  color: #555;
  margin-left: 4px;
}
@keyframes blink {
  0%,
  80%,
  100% {
    opacity: 0.2;
  }
  40% {
    opacity: 1;
  }
}
</style>
