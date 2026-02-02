<template>
  <v-card class="pa-4 mood-thread" elevation="1">
    <div class="mood-thread__header" v-if="entry.promptText || replyCount">
      <div class="text-caption text-medium-emphasis">
        {{ entry.promptText || "" }}
      </div>
      <v-spacer />
      <v-btn
        v-if="replyCount"
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
      @send-reply="handleReply"
      @vote="handleVote"
      @menu="openMessageMenu"
      @login-request="$emit('login-request')"
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
      <v-list-item
        v-else
        prepend-icon="mdi-flag"
        @click="onFlag"
      >
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
  entry: { type: Object, required: true },
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
]);
const { locale } = useI18n();

const entryAuthor = computed(() =>
  resolveProfileLocalization({
    profile: props.entry.profile,
    readerLocale: locale?.value,
  })
);

const rootMessage = computed(() => ({
  id: props.entry.id,
  replyToMessageId: null,
  senderKind: "user",
  content: props.entry.displayText,
  createdAt: props.entry.createdAt,
  score: props.entry.score ?? 0,
  myVote: props.entry.userVote ?? 0,
  authorId: props.entry.userId,
  displayname:
    entryAuthor.value.displayname ||
    props.entry.profile?.displayname ||
    "User",
  avatarUrl: props.entry.profile?.avatar_url || null,
}));

const replies = computed(() =>
  (props.entry.replies || []).map((reply) => {
    const replyAuthor = resolveProfileLocalization({
      profile: reply.profile,
      readerLocale: locale?.value,
    });
    return {
      id: reply.id,
      replyToMessageId: reply.replyToId || props.entry.id,
      senderKind: "user",
      content: reply.displayText,
      createdAt: reply.createdAt,
      score: reply.score ?? 0,
      myVote: reply.userVote ?? 0,
      authorId: reply.userId,
      displayname:
        replyAuthor.displayname ||
        reply.profile?.displayname ||
        "User",
      avatarUrl: reply.profile?.avatar_url || null,
    };
  })
);

const expanded = ref(true);
const replyCount = computed(() => (props.entry.replies || []).length);

const messagesForUI = computed(() => {
  const base = [{ ...rootMessage.value, voteTarget: "entry" }];
  if (!expanded.value) return base;
  return [...base, ...replies.value.map((r) => ({ ...r, voteTarget: "reply" }))];
});

const menu = reactive({ open: false, activator: null, id: null });
const isMineSelected = computed(() => {
  if (!menu.id || !props.meId) return false;
  const msg = messagesForUI.value.find((m) => m.id === menu.id);
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
  menu.open = false;
  if (!id) return;
  if (id === props.entry.id) {
    emit("delete-entry", { entryId: id });
  } else {
    emit("delete-reply", { entryId: props.entry.id, replyId: id });
  }
}

function onFlag() {
  const id = menu.id;
  menu.open = false;
  if (!id) return;
  if (id === props.entry.id) {
    emit("flag", { targetType: "entry", targetId: id });
  } else {
    emit("flag", { targetType: "reply", targetId: id });
  }
}

function handleReply({ id, text }) {
  if (!text?.trim()) return;
  const replyToId = id === props.entry.id ? null : id;
  emit("send-reply", { entryId: props.entry.id, text, replyToId });
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
</style>
