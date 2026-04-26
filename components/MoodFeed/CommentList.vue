<template>
  <div class="comment-list">
    <div v-if="loading" class="comment-list__skeleton" aria-hidden="true">
      <div v-for="n in 4" :key="`comment-skeleton-${n}`" class="comment-list__skeleton-item">
        <div class="comment-list__skeleton-line comment-list__skeleton-line--title" />
        <div class="comment-list__skeleton-line" />
        <div class="comment-list__skeleton-line comment-list__skeleton-line--short" />
      </div>
    </div>
    <template v-else>
      <template v-for="item in flatItems" :key="item.id">
        <MoodFeedCommentItem
          :id="item.id"
          :depth="item.depth"
          :displayname="item.displayname"
          :user-id="item.authorId || null"
          :me-id="meId"
          :avatar-url="item.avatarUrl"
          :country-emoji="item.countryEmoji"
          :gender-id="item.genderId"
          :sender-kind="item.senderKind"
          :created-at="item.createdAt"
          :display-locale="item.displayLocale"
          :source-locale="item.sourceLocale"
          :author-is-anonymous="item.authorIsAnonymous"
          :content="item.content"
          :score="item.score"
          :my-vote="item.myVote"
          :masked="item.masked"
          :deleted="item.deleted"
          :parent-name="parentName(item)"
          :vote-target="item.voteTarget"
          :can-reply="canReply"
          @reply="toggleReply"
          @vote="$emit('vote', $event)"
          @menu="$emit('menu', $event)"
          @login="$emit('login-request')"
          @profile="$emit('profile', $event)"
          @register="$emit('register')"
        >
          <template #reply-composer>
            <div v-if="canReply && activeReplyId === item.id" class="comment-list__reply">
              <ReplyInline
                :model-value="drafts.get(item.id) || ''"
                :disabled="!canReply"
                :submit-label="t('pages.feeds.replyButton', 'Reply')"
                :placeholder="t('pages.feeds.replyPlaceholder', 'Write a reply...')"
                @update:modelValue="val => drafts.set(item.id, val)"
                @submit="txt => onSubmitReply(item.id, txt)"
                @cancel="() => onCancelReply(item.id)"
              />
            </div>
          </template>
        </MoodFeedCommentItem>
      </template>
    </template>
  </div>
</template>

<script setup>
import { computed, ref, reactive, watch } from "vue";
import { useI18n } from "vue-i18n";
import MoodFeedCommentItem from "./CommentItem.vue";
import ReplyInline from "./ReplyInline.vue";

const props = defineProps({
  messages: { type: Array, required: true },
  meId: { type: String, default: null },
  loading: { type: Boolean, default: false },
  canReply: { type: Boolean, default: true },
  rootSort: { type: String, default: "asc" },
});

const emit = defineEmits([
  "reply",
  "vote",
  "menu",
  "send-reply",
  "login-request",
  "profile",
  "register",
]);
const { t } = useI18n();

const byId = computed(() => {
  const m = new Map();
  for (const msg of props.messages) m.set(msg.id, msg);
  return m;
});

const parentName = (m) => {
  const p = m?.replyToMessageId ? byId.value.get(m.replyToMessageId) : null;
  return p?.displayname || null;
};

const roots = computed(() =>
  props.messages
    .filter((m) => !m.replyToMessageId)
    .sort((a, b) => {
      const diff = new Date(a.createdAt) - new Date(b.createdAt);
      return props.rootSort === "desc" ? -diff : diff;
    })
);

const childrenMap = computed(() => {
  const map = new Map();
  for (const m of props.messages) {
    const pid = m.replyToMessageId;
    if (!pid) continue;
    if (!map.has(pid)) map.set(pid, []);
    map.get(pid).push(m);
  }
  map.forEach((arr) =>
    arr.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  );
  return map;
});

const flatItems = computed(() => {
  const out = [];
  const pushDepth = (msg, depth) => out.push({ ...msg, depth });
  for (const r of roots.value) {
    pushDepth(r, 0);
    const c1 = childrenMap.value.get(r.id) || [];
    for (const m1 of c1) {
      pushDepth(m1, 1);
      const c2 = childrenMap.value.get(m1.id) || [];
      for (const m2 of c2) pushDepth(m2, 2);
    }
  }
  return out;
});

const activeReplyId = ref(null);
const drafts = reactive(new Map());

const toggleReply = (id) => {
  if (!props.canReply) {
    emit("login-request");
    return;
  }
  activeReplyId.value = activeReplyId.value === id ? null : id;
};

const onSubmitReply = (id, text) => {
  emit("send-reply", { id, text });
  drafts.set(id, "");
  activeReplyId.value = null;
};

const onCancelReply = (id) => {
  drafts.set(id, "");
  activeReplyId.value = null;
};

watch(
  () => props.messages.length,
  () => {
    if (activeReplyId.value && !byId.value.get(activeReplyId.value)) {
      activeReplyId.value = null;
    }
  }
);
</script>

<style scoped>
.comment-list__skeleton {
  display: grid;
  gap: 0.75rem;
  padding: 0.5rem;
}

.comment-list__skeleton-item {
  padding: 0.9rem 1rem;
  border-radius: 0.95rem;
  background: rgba(148, 163, 184, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.12);
}

.comment-list__skeleton-line {
  height: 0.7rem;
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.18),
    rgba(226, 232, 240, 0.3),
    rgba(148, 163, 184, 0.18)
  );
}

.comment-list__skeleton-line + .comment-list__skeleton-line {
  margin-top: 0.55rem;
}

.comment-list__skeleton-line--title {
  width: 38%;
}

.comment-list__skeleton-line--short {
  width: 62%;
}

.comment-list__reply {
  margin-top: 0.5rem;
}
</style>
