<template>
  <div class="mood-thread">
    <div v-if="entry.promptText || replyCount" class="mood-thread__header">
      <div class="mood-thread__eyebrow">
        {{ entry.promptText || "" }}
      </div>
      <button
        v-if="replyCount"
        type="button"
        class="thread-toggle"
        :aria-label="expanded ? 'Collapse thread' : 'Expand thread'"
        @click="expanded = !expanded"
      >
        <i
          :class="['mdi', expanded ? 'mdi-chevron-up' : 'mdi-chevron-down']"
          aria-hidden="true"
        />
      </button>
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
    <div v-else class="text-body-2 text-medium-emphasis">
      {{ emptyText }}
    </div>
  </div>

  <Teleport to="body">
    <Transition name="mood-thread-menu-fade">
      <div v-if="menu.open" class="mood-thread-menu-layer" role="presentation">
        <button
          type="button"
          class="mood-thread-menu-layer__scrim"
          aria-label="Close message menu"
          @click="menu.open = false"
        />
        <div class="mood-thread-menu" :style="menuStyle" role="menu" @click.stop>
          <button
            v-if="isMineSelected"
            type="button"
            class="mood-thread-menu__item"
            role="menuitem"
            @click="onDelete"
          >
            <i class="mdi mdi-delete" aria-hidden="true" />
            <span>Delete</span>
          </button>
          <button
            v-else
            type="button"
            class="mood-thread-menu__item"
            role="menuitem"
            @click="onFlag"
          >
            <i class="mdi mdi-flag" aria-hidden="true" />
            <span>Flag</span>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
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

const menu = reactive({ open: false, id: null, top: 0, left: 0 });
const MENU_WIDTH = 188;
const menuStyle = computed(() => ({
  top: `${menu.top}px`,
  left: `${menu.left}px`,
}));
const isMineSelected = computed(() => {
  if (!menu.id || !props.meId) return false;
  const msg = messagesForUI.value.find((m) => m.id === menu.id);
  return !!msg && String(msg.authorId) === String(props.meId);
});

function openMessageMenu({ id, el }) {
  menu.open = false;
  menu.id = id || null;
  nextTick(() => {
    if (!el?.getBoundingClientRect || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const padding = 12;
    menu.top = rect.bottom + 8;
    menu.left = Math.min(
      Math.max(rect.right - MENU_WIDTH, padding),
      window.innerWidth - MENU_WIDTH - padding
    );
    menu.open = !!menu.id;
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
  padding: 1rem;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: color-mix(in oklab, rgb(var(--v-theme-surface)) 94%, rgb(var(--v-theme-primary)) 6%);
}

.mood-thread__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.mood-thread__eyebrow {
  font-size: 0.78rem;
  color: rgba(148, 163, 184, 0.9);
}

.thread-toggle {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: 999px;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.mood-thread-menu-layer {
  position: fixed;
  inset: 0;
  z-index: 2300;
}

.mood-thread-menu-layer__scrim {
  position: absolute;
  inset: 0;
  border: 0;
  background: transparent;
}

.mood-thread-menu {
  position: fixed;
  width: 188px;
  padding: 0.35rem;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 14px;
  background: rgb(var(--color-surface));
  box-shadow: 0 24px 48px rgb(var(--color-shadow) / 0.2);
}

.mood-thread-menu__item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: rgb(var(--color-foreground));
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.mood-thread-menu__item:hover,
.mood-thread-menu__item:focus-visible {
  background: rgb(var(--color-primary) / 0.1);
  outline: none;
}

.mood-thread-menu-fade-enter-active,
.mood-thread-menu-fade-leave-active {
  transition: opacity 0.16s ease;
}

.mood-thread-menu-fade-enter-from,
.mood-thread-menu-fade-leave-to {
  opacity: 0;
}
</style>
