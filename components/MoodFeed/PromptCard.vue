<template>
  <div class="mood-thread">
    <div v-if="promptText || hasExtras" class="mood-thread__header">
      <div class="mood-thread__question">
        {{ promptText }}
      </div>
      <button
        v-if="hasExtras"
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
      root-sort="desc"
      @send-reply="handleReply"
      @vote="handleVote"
      @menu="openMessageMenu"
      @login-request="$emit('login-request')"
      @profile="$emit('profile', $event)"
      @register="$emit('register')"
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
            <span>{{ t("pages.feeds.deleteButton", "Delete") }}</span>
          </button>
          <button
            v-if="isMineSelected && isAnonSelected"
            type="button"
            class="mood-thread-menu__item"
            role="menuitem"
            @click="onRegister"
          >
            <i class="mdi mdi-account-plus" aria-hidden="true" />
            <span>{{ t("pages.feeds.registerCta", "Register now") }}</span>
          </button>
          <button
            v-else
            type="button"
            class="mood-thread-menu__item"
            role="menuitem"
            @click="onFlag"
          >
            <i class="mdi mdi-flag" aria-hidden="true" />
            <span>{{ t("pages.feeds.flagButton", "Flag") }}</span>
          </button>
          <button
            v-if="canAdminDeleteEntrySelected"
            type="button"
            class="mood-thread-menu__item"
            role="menuitem"
            @click="onAdminDeleteEntry"
          >
            <i class="mdi mdi-delete" aria-hidden="true" />
            <span>{{ t("pages.feeds.deleteButton", "Delete") }}</span>
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
      countryEmoji:
        entry.profile?.country_emoji ||
        entry.authorCountryEmoji ||
        "",
      genderId:
        entry.profile?.gender_id ??
        entry.authorGenderId ??
        null,
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
        countryEmoji:
          reply.profile?.country_emoji ||
          reply.authorCountryEmoji ||
          "",
        genderId:
          reply.profile?.gender_id ??
          reply.authorGenderId ??
          null,
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

const menu = reactive({ open: false, id: null, top: 0, left: 0 });
const MENU_WIDTH = 196;
const menuStyle = computed(() => ({
  top: `${menu.top}px`,
  left: `${menu.left}px`,
}));

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

function positionMenu(el) {
  if (!el?.getBoundingClientRect || typeof window === "undefined") return;
  const rect = el.getBoundingClientRect();
  const padding = 12;
  menu.top = rect.bottom + 8;
  menu.left = Math.min(
    Math.max(rect.right - MENU_WIDTH, padding),
    window.innerWidth - MENU_WIDTH - padding
  );
}

function openMessageMenu({ id, el }) {
  menu.open = false;
  menu.id = id || null;
  nextTick(() => {
    positionMenu(el);
    menu.open = !!menu.id;
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
  --mf-thread-toggle-border: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.2);
  --mf-thread-toggle-fg: rgb(var(--v-theme-primary));
  --mf-thread-item-divider: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.1);
  border-radius: 16px;
  border: 1px solid var(--mf-thread-border);
  background: var(--mf-thread-bg);
  box-shadow: var(--mf-thread-shadow);
  backdrop-filter: blur(5px);
  padding: 1.1rem 1.2rem;
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
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.1rem;
  height: 2.1rem;
  border: 1px solid var(--mf-thread-toggle-border);
  border-radius: 999px;
  background: transparent;
  color: var(--mf-thread-toggle-fg);
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.thread-toggle:hover,
.thread-toggle:focus-visible {
  background: rgba(148, 163, 184, 0.14);
  outline: none;
}

.mood-thread :deep(.cmt + .cmt) {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--mf-thread-item-divider);
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
  width: 196px;
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
  font-size: 0.9rem;
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

@media (max-width: 960px) {
  .mood-thread {
    border-radius: 12px;
    padding: 1rem;
  }

  .mood-thread__header {
    margin-bottom: 10px;
    padding-bottom: 7px;
  }
}
</style>
