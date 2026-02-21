<template>
  <v-card class="pa-4 pa-md-5 mood-thread" elevation="0">
    <div class="mood-thread__header" v-if="promptText || hasExtras">
      <div class="mood-thread__question">
        {{ promptText }}
      </div>
      <v-spacer />
      <v-btn
        v-if="hasExtras"
        class="thread-toggle"
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
      @register="$emit('register')"
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
      <v-list-item-title>{{ t("pages.feeds.deleteButton", "Delete") }}</v-list-item-title>
    </v-list-item>
    <v-list-item
      v-if="isMineSelected && isAnonSelected"
      prepend-icon="mdi-account-plus"
      @click="onRegister"
    >
      <v-list-item-title>{{ t("pages.feeds.registerCta", "Register now") }}</v-list-item-title>
    </v-list-item>
    <v-list-item v-else prepend-icon="mdi-flag" @click="onFlag">
      <v-list-item-title>{{ t("pages.feeds.flagButton", "Flag") }}</v-list-item-title>
    </v-list-item>
    <v-list-item
      v-if="canAdminDeleteEntrySelected"
      prepend-icon="mdi-delete"
      @click="onAdminDeleteEntry"
    >
      <v-list-item-title>{{ t("pages.feeds.deleteButton", "Delete") }}</v-list-item-title>
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
  initialExpanded: { type: Boolean, default: true },
  meId: { type: String, default: null },
  canReply: { type: Boolean, default: false },
  loading: { type: Boolean, default: false },
  emptyText: { type: String, default: null },
  isAdmin: { type: Boolean, default: false },
});

const emit = defineEmits([
  "send-reply",
  "vote",
  "login-request",
  "delete-entry",
  "delete-reply",
  "flag",
  "profile",
  "register",
]);

const { locale, t } = useI18n();
const emptyText = computed(
  () => props.emptyText || t("pages.feeds.emptyReplies", "No replies yet.")
);

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
      displayLocale: entry.displayLocale || null,
      sourceLocale: entry.sourceLocale || null,
      score: entry.score ?? 0,
      myVote: entry.userVote ?? 0,
      authorId: entry.userId,
      authorIsAnonymous: !!entry.authorIsAnonymous,
      displayname:
        entryAuthor.displayname ||
        entry.profile?.displayname ||
        entry.authorDisplayname ||
        "User",
      avatarUrl:
        entry.profile?.avatar_url ||
        entry.authorAvatarUrl ||
        (entry.authorIsAnonymous ? "/images/avatars/guest-avatar.webp" : null),
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
        displayLocale: reply.displayLocale || null,
        sourceLocale: reply.sourceLocale || null,
        score: reply.score ?? 0,
        myVote: reply.userVote ?? 0,
        authorId: reply.userId,
        authorIsAnonymous: !!reply.authorIsAnonymous,
        displayname:
          replyAuthor.displayname ||
          reply.profile?.displayname ||
          reply.authorDisplayname ||
          "User",
        avatarUrl:
          reply.profile?.avatar_url ||
          reply.authorAvatarUrl ||
          (reply.authorIsAnonymous ? "/images/avatars/guest-avatar.webp" : null),
        voteTarget: "reply",
      });
    }
  }
  return out;
});

const expanded = ref(props.initialExpanded);
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
const isAnonSelected = computed(() => {
  if (!menu.id) return false;
  const msg = messageMap.value.get(menu.id);
  return !!msg && !!msg.authorIsAnonymous;
});
const canAdminDeleteEntrySelected = computed(() => {
  if (!props.isAdmin || isMineSelected.value || !menu.id) return false;
  const msg = messageMap.value.get(menu.id);
  return !!msg && msg.voteTarget === "entry";
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

function onRegister() {
  menu.open = false;
  emit("register");
}

function onAdminDeleteEntry() {
  const id = menu.id;
  const msg = messageMap.value.get(id);
  menu.open = false;
  if (!id || !msg || msg.voteTarget !== "entry") return;
  emit("delete-entry", { entryId: id });
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
  --mf-thread-border: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.16);
  --mf-thread-bg:
    radial-gradient(1200px 320px at 4% 0%, rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.1), transparent 62%),
    color-mix(in oklab, rgb(var(--v-theme-surface)) 92%, rgb(var(--v-theme-primary)) 8%);
  --mf-thread-shadow:
    0 8px 18px rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.12),
    inset 0 1px 0 rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.08);
  --mf-thread-divider: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.14);
  --mf-thread-question: color-mix(in oklab, rgb(var(--v-theme-primary)) 82%, rgb(var(--v-theme-on-surface)) 18%);
  --mf-thread-toggle-bg: color-mix(in oklab, rgb(var(--v-theme-surface)) 88%, rgb(var(--v-theme-primary)) 12%);
  --mf-thread-toggle-border: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.2);
  --mf-thread-toggle-fg: rgb(var(--v-theme-primary));
  --mf-thread-toggle-hover: color-mix(in oklab, rgb(var(--v-theme-surface)) 78%, rgb(var(--v-theme-primary)) 22%);
  --mf-thread-item-divider: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.1);
  border-radius: 16px;
  border: 1px solid var(--mf-thread-border);
  background: var(--mf-thread-bg);
  box-shadow: var(--mf-thread-shadow);
  backdrop-filter: blur(5px);
}

.mood-thread__header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--mf-thread-divider);
}

.mood-thread__question {
  font-size: clamp(1.03rem, 1.2vw, 1.2rem);
  font-weight: 700;
  line-height: 1.4;
  color: var(--mf-thread-question);
  letter-spacing: 0.012em;
}

.thread-toggle {
  border: 1px solid var(--mf-thread-toggle-border);
  background: var(--mf-thread-toggle-bg);
  color: var(--mf-thread-toggle-fg);
}

.thread-toggle:hover {
  background: var(--mf-thread-toggle-hover);
}

.mood-thread :deep(.cmt + .cmt) {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--mf-thread-item-divider);
}

@media (max-width: 960px) {
  .mood-thread {
    border-radius: 12px;
  }

  .mood-thread__header {
    margin-bottom: 10px;
    padding-bottom: 7px;
  }
}
</style>
