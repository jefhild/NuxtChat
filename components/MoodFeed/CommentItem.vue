<template>
  <div
    class="cmt"
    :class="[
      `cmt--depth-${Math.min(2, Math.max(0, depth))}`,
      {
        'cmt--agent': senderKind === 'agent',
        'cmt--system': senderKind === 'system',
      },
    ]"
  >
    <div
      class="cmt-inner"
      :class="{ 'has-avatar': !!avatarUrl, 'is-reply': depth > 0 }"
    >
      <div class="header">
        <button
          v-if="avatarUrl && userId"
          type="button"
          class="cmt-avatar-btn"
          @click="onProfileClick"
        >
          <span class="cmt-avatar-wrap">
            <span class="cmt-avatar">
              <img :src="avatarUrl" alt="" />
            </span>
            <span v-if="flagEmoji" class="cmt-avatar-flag">{{ flagEmoji }}</span>
            <i
              v-if="genderIcon"
              :class="['mdi', genderIcon, 'cmt-avatar-gender', genderClass]"
              aria-hidden="true"
            />
          </span>
        </button>
        <span v-else-if="avatarUrl" class="cmt-avatar-wrap">
          <span class="cmt-avatar"><img :src="avatarUrl" alt="" /></span>
          <span v-if="flagEmoji" class="cmt-avatar-flag">{{ flagEmoji }}</span>
          <i
            v-if="genderIcon"
            :class="['mdi', genderIcon, 'cmt-avatar-gender', genderClass]"
            aria-hidden="true"
          />
        </span>
        <div class="cmt-identity">
          <div class="cmt-meta-row">
            <button
              v-if="userId"
              type="button"
              class="cmt-name text-body-2"
              @click="onProfileClick"
            >
              {{ displayname }}
            </button>
            <strong v-else class="cmt-name-static text-body-2">
              {{ displayname }}
            </strong>
            <span class="cmt-meta text-caption cmt-date">
              {{ formatDate(createdAt) }}
            </span>
            <span
              v-if="translatedFromLabel"
              class="cmt-meta text-caption cmt-translated"
              >
              {{ translatedFromLabel }}
            </span>
          </div>
        </div>
        <button type="button" class="menu-btn" @click="onMenuClick">
          <i class="mdi mdi-dots-horizontal" aria-hidden="true" />
        </button>
      </div>

      <div class="content-row">
        <div class="body text-body-2">
          <div v-if="parentName" class="cmt-meta text-caption cmt-parent">
            {{ t("pages.feeds.replyingTo", "Replying to") }} @{{ parentName }}
          </div>
          <div v-if="masked" class="text-caption text-disabled">
            {{ t("pages.feeds.hiddenNotice", "[hidden: guidelines]") }}
          </div>
          <div v-else-if="deleted" class="text-caption text-disabled">
            {{ t("pages.feeds.deletedNotice", "[deleted]") }}
          </div>
          <div v-else class="cmt-body">{{ content }}</div>
        </div>

        <div class="actions d-flex align-center justify-end">
          <MoodFeedVoteControls
            :id="id"
            :target="voteTarget"
            :score="score"
            :my-vote="myVote"
            :disabled="disabled || senderKind === 'system'"
            @vote="(payload) => $emit('vote', payload)"
          />

          <div class="reply-meta">
            <button
              type="button"
              class="reply-btn"
              :disabled="disabled || senderKind === 'system'"
              @click="canReply ? $emit('reply', id) : $emit('login')"
            >
              {{ t("pages.feeds.replyButton", "Reply") }}
            </button>
          </div>
        </div>
      </div>
      <slot name="reply-composer"></slot>
    </div>
  </div>
</template>

<script setup>
import MoodFeedVoteControls from "@/components/MoodFeed/VoteControls.vue";
import { computed } from "vue";
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
  countryEmoji: { type: String, default: "" },
  genderId: { type: [String, Number, null], default: null },
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

const flagEmoji = computed(() => String(props.countryEmoji || "").trim());
const normalizedGenderId = computed(() => {
  const id = Number(props.genderId);
  return Number.isFinite(id) ? id : null;
});
const genderIcon = computed(() => {
  if (normalizedGenderId.value === 1) return "mdi-gender-male";
  if (normalizedGenderId.value === 2) return "mdi-gender-female";
  if (normalizedGenderId.value === 3) return "mdi-gender-non-binary";
  return "";
});
const genderClass = computed(() => {
  if (normalizedGenderId.value === 1) return "is-male";
  if (normalizedGenderId.value === 2) return "is-female";
  return "is-other";
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
  --mf-cmt-bg: color-mix(in oklab, rgb(var(--v-theme-surface)) 94%, rgb(var(--v-theme-primary)) 6%);
  --mf-cmt-border: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.12);
  --mf-cmt-hover-bg: color-mix(in oklab, rgb(var(--v-theme-surface)) 84%, rgb(var(--v-theme-primary)) 16%);
  --mf-cmt-hover-border: rgba(var(--v-theme-on-surface-rgb, 15, 23, 42), 0.22);
  --mf-cmt-reply-bg: color-mix(in oklab, rgb(var(--v-theme-surface)) 90%, rgb(var(--v-theme-primary)) 10%);
  --mf-cmt-reply-border: rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.5);
  --mf-cmt-line: rgba(var(--v-theme-primary-rgb, 59, 130, 246), 0.34);
  --mf-cmt-body: rgba(226, 232, 240, 0.96);
  --mf-cmt-name: #60a5fa;
  --mf-cmt-meta: rgba(203, 213, 225, 0.84);
  --indent: 0px;
  position: relative;
  margin: 0;
  border-radius: 10px;
  box-shadow: none;
  background: var(--mf-cmt-bg);
  border: 1px solid var(--mf-cmt-border);
}

.cmt.v-theme--dark {
  --mf-cmt-body: rgba(226, 232, 240, 0.96);
  --mf-cmt-name: #60a5fa;
  --mf-cmt-meta: rgba(203, 213, 225, 0.84);
}

.cmt.v-theme--light {
  --mf-cmt-body: rgba(30, 41, 59, 0.94);
  --mf-cmt-name: #1d4ed8;
  --mf-cmt-meta: rgba(51, 65, 85, 0.72);
}

.cmt:hover {
  background: var(--mf-cmt-hover-bg);
  border-color: var(--mf-cmt-hover-border);
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
  padding-top: 4px;
  padding-right: 10px;
  padding-bottom: 4px;
  padding-left: calc(var(--indent) + 16px) !important;
}

.cmt-inner.is-reply {
  background: var(--mf-cmt-reply-bg);
  border-left: 3px solid var(--mf-cmt-reply-border);
  margin-left: 6px;
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
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
  background: var(--mf-cmt-line);
  opacity: 0.75;
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
  display: flex;
  align-items: center;
  margin-bottom: 1px !important;
}
.cmt .body {
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  min-width: 0;
}

.cmt .actions {
  margin-top: 0;
  margin-bottom: 0;
  flex: 0 0 auto;
  white-space: nowrap;
}

.menu-btn {
  margin-left: auto;
}

.content-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 10px;
}

.content-row .body {
  flex: 1 1 auto;
}

.reply-meta {
  display: flex;
  align-items: center;
}

.reply-btn,
.menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 1.9rem;
  padding: 0.25rem 0.55rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgba(226, 232, 240, 0.82);
  font: inherit;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease, opacity 0.18s ease;
}

.reply-btn:hover,
.menu-btn:hover {
  background: rgba(148, 163, 184, 0.16);
  color: rgba(241, 245, 249, 0.98);
}

.reply-btn:focus-visible,
.menu-btn:focus-visible {
  outline: 2px solid rgba(96, 165, 250, 0.34);
  outline-offset: 1px;
}

.reply-btn:disabled,
.menu-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cmt .body .text-caption.text-medium-emphasis {
  margin-top: 0 !important;
  margin-bottom: 1px !important;
  line-height: 1.2;
}

.cmt-meta {
  color: var(--mf-cmt-meta) !important;
}

.cmt-meta-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 6px;
}

.cmt-identity {
  min-width: 0;
}

.cmt-date::before {
  content: "• ";
}

.cmt-translated::before {
  content: "• ";
}

.cmt-translated {
  font-style: italic;
}

.cmt-body {
  white-space: pre-wrap;
  margin: 0;
  line-height: 1.5;
  color: var(--mf-cmt-body);
}

.cmt-name {
  font-weight: 700;
  color: var(--mf-cmt-name);
  cursor: pointer;
  background: none;
  border: none;
  padding: 0;
}

.cmt-name-static {
  color: var(--mf-cmt-name);
}

.cmt-name:hover {
  text-decoration: underline;
}

.cmt-avatar-wrap {
  position: relative;
  display: inline-flex;
}

.cmt-avatar {
  display: inline-flex;
  width: 28px;
  height: 28px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.24);
}

.cmt-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cmt-avatar-flag {
  position: absolute;
  right: -6px;
  top: -1px;
  font-size: 1.02rem;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(2, 6, 23, 0.75);
  z-index: 2;
}

.cmt-avatar-gender {
  position: absolute;
  left: -7px;
  bottom: -6px;
  background: transparent;
  border-radius: 999px;
  padding: 2px;
  color: #9ca3af;
  z-index: 2;
}

.cmt-avatar-gender.is-male {
  color: #2563eb;
}

.cmt-avatar-gender.is-female {
  color: #ec4899;
}

.cmt-avatar-gender.is-other {
  color: #7c3aed;
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

@media (max-width: 960px) {
  .cmt {
    border-radius: 8px;
  }

  .cmt-inner {
    padding-right: 8px;
    padding-left: calc(var(--indent) + 12px) !important;
  }

  .cmt-inner.has-avatar .body,
  .cmt-inner.has-avatar .actions {
    padding-left: 0;
  }
}

@media (max-width: 760px) {
  .content-row {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 6px;
  }

  .cmt .actions {
    width: 100%;
    justify-content: flex-end;
  }

  .cmt-meta-row { row-gap: 2px; }

  .cmt-date::before {
    content: "";
  }

  .cmt-translated::before {
    content: "";
  }
}
</style>
