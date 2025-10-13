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
    <div class="cmt-inner" :class="{ 'has-avatar': !!avatarUrl }">
      <!-- Row A: header -->
      <div class="header d-flex align-center mb-1">
        <v-avatar size="28" class="mr-2" v-if="avatarUrl"
          ><v-img :src="avatarUrl"
        /></v-avatar>
        <div class="d-flex align-center flex-wrap gap-2">
          <strong class="text-body-2 text-blue-darken-4">{{ displayname }}</strong>
          <v-chip v-if="isOp" size="x-small" variant="tonal">OP</v-chip>
          <v-chip
            v-if="senderKind === 'agent'"
            size="x-small"
            color="primary"
            variant="tonal"
            >Topic Agent</v-chip
          >
          <span class="text-caption text-medium-emphasis"
            >• {{ formatDate(createdAt) }}</span
          >
        </div>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          density="comfortable"
          @click="$emit('menu', id)"
        >
          <v-icon size="18">mdi-dots-horizontal</v-icon>
        </v-btn>
      </div>

      <!-- Row B: body -->
      <div class="body text-body-2">
        <div v-if="parentName" class="text-caption text-medium-emphasis mb-1">
          replying to @{{ parentName }}
        </div>
        <div v-if="masked" class="text-caption text-disabled">
          [hidden: guidelines]
        </div>
        <div v-else-if="deleted" class="text-caption text-disabled">
          [deleted]
        </div>
        <div v-else class="cmt-body">{{ content }}</div>
      </div>

      <!-- Row C: actions -->
  <div class="actions d-flex align-center justify-end">
    <ArticlesVoteControls
      :score="score"
      :my-vote="myVote"
      :disabled="disabled || senderKind === 'system'"
      @vote="onVote"
    />
    <v-btn
      variant="text"
      size="small"
      class="ml-1"
      :disabled="disabled || senderKind === 'system'"
      @click="canReply ? $emit('reply', id) : $emit('login')"  
    >
      Reply
    </v-btn>
  </div>
      <slot name="reply-composer"></slot>
    </div>
  </v-sheet>
</template>

<script setup>
const props = defineProps({
  id: { type: String, required: true },
  depth: { type: Number, default: 0 }, // 0..2
  displayname: { type: String, required: true },
  avatarUrl: { type: String, default: null },
  senderKind: { type: String, default: "user" }, // 'user'|'agent'|'system'
  createdAt: { type: String, required: true },
  content: { type: String, required: true },
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },
  parentName: { type: String, default: null },
  parentExcerpt: { type: String, default: null },
  masked: { type: Boolean, default: false },
  deleted: { type: Boolean, default: false },
  isOp: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  canReply: { type: Boolean, default: true },
});

const emit = defineEmits(["reply", "vote", "menu", "login"]);

/** SSR-safe format */
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
const onVote = (v) => emit("vote", { id: props.id, value: v });
</script>

<style scoped>
/* ── Card container (flat + tight) ─────────────────────────────────────────── */
.cmt {
  --indent: 0px;                 /* set via depth classes or inline style */
  position: relative;
  margin: 0;                     /* no gap between comments */
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.cmt:hover {
  /* fallback first (works everywhere) */
  background-color: rgba(0, 0, 0, 0.04);
  /* prefer theme vars if available */
  background-color: rgba(var(--v-theme-on-surface-rgb, 0,0,0), 0.02);
}

/* Optional: a subtle left accent on hover for clarity */
.cmt:hover {
  outline: 1px solid rgba(var(--v-theme-on-surface-rgb, 0,0,0), 0.06);
  outline-offset: -1px;
}

/* depth indent (max 2) */
.cmt--depth-0 { --indent: 0px; }
.cmt--depth-1 { --indent: 16px; }
.cmt--depth-2 { --indent: 32px; }

/* ── Inner layout: compact padding + reliable left indent ─────────────────── */
.cmt-inner {
  /* force our indent to win over Vuetify utilities */
  padding-top: 0px;
  padding-right: 8px;
  padding-bottom: 0px;
  padding-left: calc(var(--indent) + 8px) !important;
}

/* If header shows an avatar, nudge body/actions so text aligns under name */
.cmt-inner.has-avatar .body,
.cmt-inner.has-avatar .actions {
  padding-left: 32px; /* 24–28px avatar + small gap; tweak if you change sizes */
}

/* ── Vertical guide line for replies ──────────────────────────────────────── */
.cmt::before {
  content: "";
  position: absolute;
  left: calc(var(--indent) + 2px);
  top: 0;
  bottom: 0;
  width: 2px;
  background: color-mix(in oklab, currentColor 15%, transparent);
  opacity: 0.4;
}
.cmt--depth-0::before { display: none; }

/* ── Row compaction (header / body / actions) ─────────────────────────────── */
.cmt .header,
.cmt .body,
.cmt .actions {
  margin: 0;
  padding: 0;
  line-height: 1.3;
}

/* tighten header ↔ body spacing */
.cmt .header { margin-bottom: 1px !important; }
.cmt .body   { margin-top: 0 !important; margin-bottom: 2px !important; }

/* actions bar flush to bottom */
.cmt .actions { margin-top: 0; margin-bottom: 0; }

/* "replying to @name" line sits close to header and body */
.cmt .body .text-caption.text-medium-emphasis {
  margin-top: 0 !important;
  margin-bottom: 1px !important;
  line-height: 1.2;
}

/* main message text */
.cmt-body {
  white-space: pre-wrap;
  margin: 0;
}

/* ── Sender cues ─────────────────────────────────────────────────────────── */
.cmt--agent {
  border-left: 2px solid var(--v-theme-primary);
  background: color-mix(in oklab, var(--v-theme-surface) 96%, var(--v-theme-primary) 4%);
}
.cmt--system { opacity: 0.85; }

/* ── Small UI tweaks ─────────────────────────────────────────────────────── */
.v-chip {
  height: 18px;
  font-size: 0.7rem;
  padding: 0 4px;
}
.v-avatar { --v-avatar-size: 24px; }
</style>
