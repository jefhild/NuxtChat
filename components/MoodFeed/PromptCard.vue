<template>
  <v-card class="pa-4 mood-thread" elevation="1">
    <div class="mood-thread__header" v-if="promptText || hasExtras">
      <div class="mood-thread__question">
        {{ promptText }}
      </div>
      <v-spacer />
      <v-btn
        v-if="hasExtras"
        icon
        variant="text"
        density="comfortable"
        @click="expanded = !expanded"
      >
        <v-icon size="18">
          {{ expanded ? "mdi-chevron-up" : "mdi-chevron-down" }}
        </v-icon>
      </v-btn>
    </div>
    <MoodFeedCommentList
      v-if="messagesForUI.length"
      :messages="messagesForUI"
      :me-id="meId"
      :loading="loading"
      :can-reply="canReply"
      root-sort="desc"
      @send-reply="handleReply"
      @vote="handleVote"
      @menu="openMessageMenu"
      @login-request="$emit('login-request')"
      @profile="$emit('profile', $event)"
    />
    <div v-else class="text-body-2 text-medium-emphasis mb-2">
      {{ emptyText }}
    </div>
  </v-card>

  <v-menu
    v-model="menu.open"
    :activator="menu.activator"
    location="bottom end"
    origin="top end"
    :close-on-content-click="true"
    transition="fade-transition"
  >
    <v-list density="compact" min-width="180">
      <v-list-item
        v-if="isMineSelected"
        prepend-icon="mdi-delete"
        @click="onDelete"
      >
        <v-list-item-title>Delete</v-list-item-title>
      </v-list-item>
      <v-list-item v-else prepend-icon="mdi-flag" @click="onFlag">
        <v-list-item-title>Flag</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
import MoodFeedCommentList from "@/components/MoodFeed/CommentList.vue";
import { computed, ref, reactive, nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const props = defineProps({
  thread: { type: Object, required: true },
  meId: { type: String, default: null },
  canReply: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: "No replies yet." },
});

const emit = defineEmits([
  "send-reply",
  "vote",
  "login-request",
  "delete-entry",
  "delete-reply",
  "flag",
  "profile",
]);

const { locale } = useI18n();

const promptText = computed(() => props.thread.promptText || "");

const entryMessages = computed(() =>
  (props.thread.entries || []).map((entry) => {
    const entryAuthor = resolveProfileLocalization({
      profile: entry.profile,
      readerLocale: locale?.value,
    });
    return {
      id: entry.id,
      entryId: entry.id,
      replyToMessageId: null,
      senderKind: "user",
      content: entry.displayText,
      createdAt: entry.createdAt,
      score: entry.score ?? 0,
      myVote: entry.userVote ?? 0,
      authorId: entry.userId,
      displayname:
        entryAuthor.displayname || entry.profile?.displayname || "User",
      avatarUrl: entry.profile?.avatar_url || null,
      voteTarget: "entry",
    };
  })
);

const rootMessages = computed(() =>
  [...entryMessages.value].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )
);

const replyMessages = computed(() => {
  const out = [];
  for (const entry of props.thread.entries || []) {
    for (const reply of entry.replies || []) {
      const replyAuthor = resolveProfileLocalization({
        profile: reply.profile,
        readerLocale: locale?.value,
      });
      out.push({
        id: reply.id,
        entryId: entry.id,
        replyToMessageId: reply.replyToId || entry.id,
        senderKind: "user",
        content: reply.displayText,
        createdAt: reply.createdAt,
        score: reply.score ?? 0,
        myVote: reply.userVote ?? 0,
        authorId: reply.userId,
        displayname:
          replyAuthor.displayname || reply.profile?.displayname || "User",
        avatarUrl: reply.profile?.avatar_url || null,
        voteTarget: "reply",
      });
    }
  }
  return out;
});

const expanded = ref(true);
const hasExtras = computed(() => {
  const totalMessages = entryMessages.value.length + replyMessages.value.length;
  return totalMessages > 1;
});

const messagesForUI = computed(() => {
  const roots = rootMessages.value;
  if (!expanded.value) return roots.length ? [roots[0]] : [];
  return [...roots, ...replyMessages.value];
});

const menu = reactive({ open: false, activator: null, id: null });
const messageMap = computed(() => {
  const map = new Map();
  for (const msg of messagesForUI.value) map.set(msg.id, msg);
  return map;
});

const isMineSelected = computed(() => {
  if (!menu.id || !props.meId) return false;
  const msg = messageMap.value.get(menu.id);
  return !!msg && String(msg.authorId) === String(props.meId);
});

function openMessageMenu({ id, el }) {
  menu.open = false;
  menu.activator = null;
  menu.id = id || null;
  nextTick(() => {
    menu.activator = el || null;
    menu.open = !!menu.activator;
  });
}

function onDelete() {
  const id = menu.id;
  const msg = messageMap.value.get(id);
  menu.open = false;
  if (!id || !msg) return;
  if (msg.voteTarget === "entry") {
    emit("delete-entry", { entryId: id });
  } else {
    emit("delete-reply", { entryId: msg.entryId, replyId: id });
  }
}

function onFlag() {
  const id = menu.id;
  const msg = messageMap.value.get(id);
  menu.open = false;
  if (!id || !msg) return;
  if (msg.voteTarget === "entry") {
    emit("flag", { targetType: "entry", targetId: id });
  } else {
    emit("flag", { targetType: "reply", targetId: id });
  }
}

function handleReply({ id, text }) {
  if (!text?.trim()) return;
  const msg = messageMap.value.get(id);
  if (!msg) return;
  const replyToId = msg.voteTarget === "entry" ? null : msg.id;
  emit("send-reply", { entryId: msg.entryId, text, replyToId });
}

function handleVote(payload) {
  emit("vote", payload);
}
</script>

<style scoped>
.mood-thread {
  margin-bottom: 16px;
}
.mood-thread__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.mood-thread__question {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(var(--v-theme-primary-rgb, 63, 81, 181), 0.95);
}
</style>
