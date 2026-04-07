<template>
  <!-- Regular3.vue template -->
  <div ref="wrapRef" class="d-flex flex-column h-100 overflow-hidden">
    <div
      ref="vsRef"
      class="overflow-y-auto"
      :style="{ height: `${listHeight}px` }"
    >
      <div v-for="item in items" :key="item.id || item._peerTempKey || item._tempKey || 'typing'">
        <template v-if="item._typing">
          <ChatLayoutTypingBubble />
        </template>
        <template v-else>
          <div>
            <ChatLayoutChatBubble
              :from-me="item.sender_id === meId"
              :html="render(item._displayContent)"
              :time="formatDisplayTime(item.created_at)"
              :name="item._name"
              :avatar="item._avatar"
              :status="item._status"
              :show-meta="Boolean(item._name || item._avatar || item.created_at)"
            />
            <div
              v-if="isLastBotMessage(item)"
              class="chat-quick-replies chat-quick-replies--inline"
            >
              <v-chip
                v-for="q in quickReplies"
                :key="q"
                color="primary"
                variant="outlined"
                size="small"
                @click="$emit('quick-reply', q)"
              >
                {{ q }}
              </v-chip>
            </div>
          </div>
        </template>
      </div>
    </div>
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
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const typingStore = useTypingStore();

const { init: initMd, render } = useMarkdown();

const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
const IMCHATTY_AVATAR = "/images/robot.png";

const props = defineProps({
  meId: { type: String, required: true },
  peer: { type: Object, default: null }, // should contain displayname/id
  blockedUserIds: { type: Array, default: () => [] },
  quickReplies: { type: Array, default: () => [] },
  showQuickReplies: { type: Boolean, default: false },
});
defineEmits(["quick-reply"]);

const db = useDb();
const msgs = useMessagesStore();

// ── state
const messages = ref([]);
const loading = ref(false);
const typing = ref(false); // 🔹 NEW: show typing chip

const { locale, t } = useI18n();
const peerName = computed(() =>
  resolveProfileLocalization({
    profile: props.peer,
    readerLocale: locale?.value,
  }).displayname || ""
);
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
  const base = (messages.value || []).map((m) => {
    const isReceiver = String(m.receiver_id) === String(props.meId);
    const hasTranslation = Boolean(m.translated_content) && isReceiver;
    const senderId = String(m.sender_id || "");
    let name =
      m._senderName ??
      (senderId === String(props.meId) ? meName : peerName.value);
    let avatar =
      m._senderAvatar ??
      (senderId === String(props.meId) ? "" : peerAvatar.value);
    if (!m._senderName && senderId === IMCHATTY_ID) {
      name = "ImChatty";
      avatar = IMCHATTY_AVATAR;
    }
    return {
      ...m,
      _name: name,
      _avatar: avatar,
      _displayContent: hasTranslation ? m.translated_content : m.content,
      _status: hasTranslation ? t("components.chatTranslation.translated") : "",
    };
  });
  return showTyping.value
    ? [...base, { _typing: true, id: `typing-${peerId.value}` }]
    : base;
});

const lastBotMessageId = computed(() => {
  const list = items.value || [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const it = list[i];
    if (it?._typing) continue;
    if (String(it.sender_id) === String(peerId.value)) return it.id || it._peerTempKey || null;
  }
  return null;
});

const showQuickReplyBar = computed(
  () =>
    props.showQuickReplies &&
    Boolean(lastBotMessageId.value) &&
    props.quickReplies.length > 0
);
const showQuickReplyInline = computed(() => showQuickReplyBar.value);

function isLastBotMessage(item) {
  if (!item) return false;
  const botId = String(peerId.value);
  if (String(item.sender_id) !== botId) return false;
  const id = item.id || item._peerTempKey || null;
  return !!id && id === lastBotMessageId.value;
}

const peerId = computed(() =>
  String(props.peer?.user_id || props.peer?.id || "")
);
const blockedSet = computed(
  () => new Set((props.blockedUserIds || []).map((id) => String(id)))
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

const listHeight = ref(420);

let roWrap, roHeader, roComposer;
let emptyThreadRetryTimer = null;
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
  if (emptyThreadRetryTimer) {
    clearTimeout(emptyThreadRetryTimer);
    emptyThreadRetryTimer = null;
  }
});

const scrollEl = () => vsRef.value || null;
const raf = () => new Promise((r) => requestAnimationFrame(r));
const scrollToBottom = async () => {
  await nextTick();
  await raf();
  const el = scrollEl();
  if (el) el.scrollTop = el.scrollHeight;
};
function isNearBottom(el, threshold = 80) {
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

// ── Load thread
const loadThread = async () => {
  if (emptyThreadRetryTimer) {
    clearTimeout(emptyThreadRetryTimer);
    emptyThreadRetryTimer = null;
  }
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
    messages.value = (rows || []).filter(
      (msg) =>
        !blockedSet.value.has(String(msg.sender_id)) &&
        !blockedSet.value.has(String(msg.receiver_id))
    );
    if (!messages.value.length && String(peerId.value) === IMCHATTY_ID) {
      const meSnapshot = String(props.meId || "");
      const peerSnapshot = String(peerId.value || "");
      emptyThreadRetryTimer = setTimeout(async () => {
        emptyThreadRetryTimer = null;
        if (
          String(props.meId || "") !== meSnapshot ||
          String(peerId.value || "") !== peerSnapshot ||
          messages.value.length
        ) {
          return;
        }
        try {
          const retryRows = await db.getMessagesBetweenUsers(
            props.meId,
            peerId.value,
            null,
            40
          );
          const filtered = (retryRows || []).filter(
            (msg) =>
              !blockedSet.value.has(String(msg.sender_id)) &&
              !blockedSet.value.has(String(msg.receiver_id))
          );
          if (filtered.length) {
            messages.value = filtered;
            await scrollToBottom();
            await msgs.markThreadAsRead(peerId.value);
          }
        } catch {}
      }, 900);
    }
    await scrollToBottom();
    await msgs.markThreadAsRead(peerId.value);
  } finally {
    loading.value = false;
  }
};
onMounted(loadThread);

watch(
  () => props.meId,
  async (nextId) => {
    // Safe to call; your store will no-op if already wired
    await msgs.init(nextId);
  },
  { immediate: true }
);

watch([() => peerId.value, () => props.blockedUserIds, () => props.meId], loadThread);

// ── Expose functions parent can call
defineExpose({
  appendLocalAndSend,
  appendPeerLocal,
  setTyping, // 🔹 expose so parent/AI controller can toggle typing
  getLastMessages,
  getAssistantTurnCount,
});

// 🔹 NEW: toggler to show/hide typing chip (call when you start/stop AI)
function setTyping(val, label) {
  typing.value = !!val;
  if (typing.value) {
    scrollToBottom();
  }
  // you can optionally override label per call if you want
  if (typeof label === "string" && label) {
    // if you want dynamic labels, convert typingLabel to a ref and set here
    // keeping computed for now (from peer.displayname)
  }
}



// temp-append a peer (bot/other user) message
async function appendPeerLocal(text, options = null) {
  if (!text || !props.meId || !peerId.value) return;
  const senderId = options?.senderId || peerId.value;

  const temp = {
    _peerTempKey: `peer-tmp-${Date.now()}`,
    id: null,
    sender_id: senderId,
    receiver_id: props.meId,
    content: text,
    created_at: new Date().toISOString(),
    read: false,
    _senderName: options?.senderName || null,
    _senderAvatar: options?.senderAvatar || null,
  };
  messages.value = [...messages.value, temp];
  await scrollToBottom();
}





// ── Sending my own message (unchanged)
async function appendLocalAndSend(text, options = null) {
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

  const rows = await db.insertMessage(peerId.value, meId, text, null, null, null, null, options);
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

function getAssistantTurnCount() {
  const meId = String(props.meId || "");
  return (messages.value || []).reduce((count, m) => {
    const senderId = String(m?.sender_id || "");
    if (!senderId || senderId === meId) return count;
    return count + 1;
  }, 0);
}

watch(
  () => msgs.incoming,
  async (m) => {
    if (!m) return;

    const sender = String(m.sender_id || "");
    const receiver = String(m.receiver_id || "");
    const me = String(props.meId || "");
    const peer = String(peerId.value || "");

    // only for this open thread (either direction)
    if (!((sender === peer && receiver === me) || (sender === me && receiver === peer))) {
      return;
    }
    if (
      blockedSet.value.has(String(m.sender_id)) ||
      blockedSet.value.has(String(m.receiver_id))
    ) {
      return;
    }

    const isPeerToMe = sender === peer && receiver === me;
    const isMeToPeer = sender === me && receiver === peer;

    // only stop typing when the peer/bot message arrives (not on my own echo)
    if (isPeerToMe) {
      typing.value = false;
    }

    // If we already have this message (e.g., from initial load), update/skip
    if (m.id != null) {
      const existingIdx = messages.value.findIndex(
        (x) => x.id != null && String(x.id) === String(m.id)
      );
      if (existingIdx !== -1) {
        const copy = messages.value.slice();
        copy[existingIdx] = m;
        messages.value = copy;
        await msgs.markThreadAsRead(peerId.value);
        return;
      }
    }

    // Try to reconcile a peer temp message (avoid duplicates)
    const peerTempIdx = messages.value.findIndex(
      x =>
        x._peerTempKey &&                // only our temp peers
        x.sender_id === m.sender_id &&
        x.receiver_id === m.receiver_id &&
        x.content === m.content          // simple heuristic
    );
    if (peerTempIdx !== -1) {
      const copy = messages.value.slice();
      copy[peerTempIdx] = m;             // replace temp with server row
      messages.value = copy;
    } else {
      // Reconcile my optimistic local temp message to avoid transient duplicates
      // when realtime echo arrives before insertMessage() resolves.
      if (isMeToPeer) {
        const myTempIdx = messages.value.findIndex(
          (x) =>
            x._tempKey &&
            x.id == null &&
            String(x.sender_id) === sender &&
            String(x.receiver_id) === receiver &&
            String(x.content || "") === String(m.content || "")
        );
        if (myTempIdx !== -1) {
          const copy = messages.value.slice();
          copy[myTempIdx] = m;
          messages.value = copy;
          await msgs.markThreadAsRead(peerId.value);
          return;
        }
      }
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

.chat-quick-replies {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0 8px;
  padding-left: 42px;
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
