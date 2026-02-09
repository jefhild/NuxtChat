<template>
  <v-sheet
    class="cmt"
    :class="[
      `cmt--depth-${Math.min(2, Math.max(0, depth))}`,
      {
        'cmt--agent': senderKind === 'agent',
        'cmt--system': senderKind === 'system',
      },
    ]"
    :color="senderKind === 'agent' ? 'surface-variant' : undefined"
    rounded="lg"
    elevation="0"
  >
    <div
      class="cmt-inner"
      :class="{ 'has-avatar': !!avatarUrl, 'is-reply': depth > 0 }"
    >
      <div class="header d-flex align-center mb-1">
        <button
          v-if="avatarUrl && userId"
          type="button"
          class="cmt-avatar-btn mr-2"
          @click="onProfileClick"
        >
          <v-avatar size="28">
            <v-img :src="avatarUrl" />
          </v-avatar>
        </button>
        <v-avatar v-else size="28" class="mr-2" v-if="avatarUrl"
          ><v-img :src="avatarUrl"
        /></v-avatar>
        <div class="d-flex align-center flex-wrap gap-2">
          <button
            v-if="userId"
            type="button"
            class="cmt-name text-body-2 text-blue-darken-4"
            @click="onProfileClick"
          >
            {{ displayname }}
          </button>
          <strong v-else class="text-body-2 text-blue-darken-4">
            {{ displayname }}
          </strong>
          <span class="text-caption text-medium-emphasis"
            >• {{ formatDate(createdAt) }}</span
          >
        </div>
        <v-spacer />
        <v-btn icon variant="text" density="comfortable" @click="onMenuClick">
          <v-icon size="18">mdi-dots-horizontal</v-icon>
        </v-btn>
      </div>

      <div class="body text-body-2">
        <div v-if="parentName" class="text-caption text-medium-emphasis mb-1">
          {{ t("pages.feeds.replyingTo", "Replying to") }} @{{ parentName }}
        </div>
        <div
          v-if="translatedFromLabel"
          class="text-caption text-medium-emphasis mb-1"
        >
          {{ translatedFromLabel }}
        </div>
        <div v-if="masked" class="text-caption text-disabled">
          {{ t("pages.feeds.hiddenNotice", "[hidden: guidelines]") }}
        </div>
        <div v-else-if="deleted" class="text-caption text-disabled">
          {{ t("pages.feeds.deletedNotice", "[deleted]") }}
        </div>
        <div v-else class="cmt-body">{{ content }}</div>
      </div>

      <div class="actions d-flex align-end justify-end">
        <MoodFeedVoteControls
          :id="id"
          :target="voteTarget"
          :score="score"
          :my-vote="myVote"
          :disabled="disabled || senderKind === 'system'"
          @vote="(payload) => $emit('vote', payload)"
        />

        <div class="reply-meta">
          <v-btn
            variant="text"
            size="small"
            class="ml-1"
            :disabled="disabled || senderKind === 'system'"
            @click="canReply ? $emit('reply', id) : $emit('login')"
          >
            {{ t("pages.feeds.replyButton", "Reply") }}
          </v-btn>
        </div>
      </div>
      <slot name="reply-composer"></slot>
    </div>
  </v-sheet>
</template>

<script setup>
import MoodFeedVoteControls from "@/components/MoodFeed/VoteControls.vue";
import { useI18n } from "vue-i18n";

const emit = defineEmits(["reply", "vote", "menu", "login", "profile", "register"]);
const { t, locale } = useI18n();

const props = defineProps({
  id: { type: String, required: true },
  depth: { type: Number, default: 0 },
  displayname: { type: String, required: true },
  userId: { type: String, default: null },
  meId: { type: String, default: null },
  avatarUrl: { type: String, default: null },
  senderKind: { type: String, default: "user" },
  createdAt: { type: String, required: true },
  displayLocale: { type: String, default: null },
  sourceLocale: { type: String, default: null },
  authorIsAnonymous: { type: Boolean, default: false },
  content: { type: String, required: true },
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },
  parentName: { type: String, default: null },
  masked: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  canReply: { type: Boolean, default: true },
  voteTarget: { type: String, default: "reply" }, // 'entry' | 'reply'
});

const activatorId = computed(() => `comment-menu-btn-${props.id}`);
const normalizeLocale = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0];

const showTranslationLabel = computed(() => {
  if (!props.displayLocale || !props.sourceLocale) return false;
  const displayBase = normalizeLocale(props.displayLocale);
  const sourceBase = normalizeLocale(props.sourceLocale);
  if (!displayBase || !sourceBase) return false;
  return displayBase !== sourceBase;
});

const formatLocale = (value) => {
  const base = normalizeLocale(value);
  if (!base) return "";
  const uiBase = normalizeLocale(locale.value);
  const labelsByUi = {
    en: { en: "English", fr: "French", ru: "Russian", zh: "Chinese" },
    fr: { en: "Anglais", fr: "Français", ru: "Russe", zh: "Chinois" },
    ru: { en: "Английский", fr: "Французский", ru: "Русский", zh: "Китайский" },
    zh: { en: "英语", fr: "法语", ru: "俄语", zh: "中文" },
  };
  const label = labelsByUi[uiBase]?.[base];
  return label || base.toUpperCase();
};

const translatedFromLabel = computed(() => {
  if (!showTranslationLabel.value) return "";
  const formatted = formatLocale(props.sourceLocale);
  if (!formatted) return "";
  return t("pages.feeds.translatedFrom", { locale: formatted });
});

const timeFmt = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});
const formatDate = (iso) => {
  try {
    return timeFmt.format(new Date(iso));
  } catch {
    return "";
  }
};

function onMenuClick(e) {
  emit("menu", { id: props.id, el: e?.currentTarget || null });
}

function onProfileClick() {
  if (!props.userId) return;
  if (
    props.authorIsAnonymous &&
    props.meId &&
    String(props.userId) === String(props.meId)
  ) {
    emit("register");
    return;
  }
  emit("profile", props.userId);
}
</script>

<style scoped>
.cmt {
  --indent: 0px;
  position: relative;
  margin: 0;
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.cmt:hover {
  background-color: rgba(0, 0, 0, 0.04);
  background-color: rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.02);
}

.cmt:hover {
  outline: 1px solid rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.06);
  outline-offset: -1px;
}

.cmt--depth-0 {
  --indent: 0px;
}
.cmt--depth-1 {
  --indent: 28px;
}
.cmt--depth-2 {
  --indent: 56px;
}

.cmt-inner {
  padding-top: 0px;
  padding-right: 8px;
  padding-bottom: 0px;
  padding-left: calc(var(--indent) + 16px) !important;
}

.cmt-inner.is-reply {
  background: rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.02);
  border-left: 3px solid rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.2);
  margin-left: 6px;
}

.cmt-inner.has-avatar .body,
.cmt-inner.has-avatar .actions {
  padding-left: 32px;
}

.cmt::before {
  content: "";
  position: absolute;
  left: calc(var(--indent) + 6px);
  top: 6px;
  bottom: 6px;
  width: 3px;
  background: rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.18);
  opacity: 1;
}
.cmt--depth-0::before {
  display: none;
}

.cmt .header,
.cmt .body,
.cmt .actions {
  margin: 0;
  padding: 0;
  line-height: 1.3;
}

.cmt .header {
  margin-bottom: 1px !important;
}
.cmt .body {
  margin-top: 0 !important;
  margin-bottom: 2px !important;
}

.cmt .actions {
  margin-top: 0;
  margin-bottom: 0;
}

.reply-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.cmt .body .text-caption.text-medium-emphasis {
  margin-top: 0 !important;
  margin-bottom: 1px !important;
  line-height: 1.2;
}

.cmt-body {
  white-space: pre-wrap;
  margin: 0;
}

.cmt-name {
  font-weight: 700;
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

.cmt-name:hover {
  text-decoration: underline;
}

.cmt-avatar-btn {
  border: none;
  padding: 0;
  background: none;
  cursor: pointer;
}

.cmt--agent {
  border-left: 2px solid var(--v-theme-primary);
  background: color-mix(
    in oklab,
    var(--v-theme-surface) 96%,
    var(--v-theme-primary) 4%
  );
}
.cmt--system {
  opacity: 0.85;
}

.v-chip {
  height: 18px;
  font-size: 0.7rem;
  padding: 0 4px;
}
.v-avatar {
  --v-avatar-size: 24px;
}
</style>
