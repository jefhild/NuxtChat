<template>
  <v-sheet
    class="cmt"
    :class="[
      {
        'cmt--agent': senderKind === 'agent',
        'cmt--system': senderKind === 'system',
      },
    ]"
    :style="{ '--indent': indentPx }"
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
          <!-- Profile peek on display name -->
          <v-menu
            v-if="author"
            v-model="peekOpen"
            :close-on-content-click="false"
            location="bottom start"
            offset="6"
          >
            <template #activator="{ props: actv }">
              <strong
                class="text-body-2 text-blue-darken-4 cursor-pointer"
                v-bind="actv"
                :aria-haspopup="'dialog'"
                :aria-expanded="String(peekOpen)"
              >
                {{ displayname }}
              </strong>
            </template>
            <v-card
              width="300"
              elevation="8"
              class="pa-3 position-relative"
              role="dialog"
              aria-label="User profile"
            >
              <!-- Country emoji badge (top-right) -->
              <!-- <div
                v-if="author.country?.emoji"
                class="absolute top-2 right-2 text-2xl select-none"
                :title="author.country?.name"
              >
                {{ author.country.emoji }}
              </div> -->

              <v-tooltip
                v-if="author.country?.emoji"
                :text="author.country?.name"
                location="top"
              >
                <template #activator="{ props }">
                  <div
                    v-bind="props"
                    class="absolute top-2 right-2 text-2xl select-none cursor-default"
                  >
                    {{ author.country.emoji }}
                  </div>
                </template>
              </v-tooltip>

              <div class="d-flex align-start gap-3">
                <div class="avatar-with-icon relative">
                  <v-avatar size="32">
                    <v-img :src="getAvatar(avatarUrl, author.gender.id)" />
                  </v-avatar>

                  <!-- Gender icon overlay -->
                  <v-icon
                    class="gender-icon absolute"
                    :color="getGenderColor(author.gender.id)"
                    size="20"
                    :title="author.gender?.name || 'Other/Unspecified'"
                    :icon="getAvatarIcon(author.gender.id)"
                  />
                </div>

                <div class="min-w-0">
                  <div class="text-subtitle-2 font-weight-medium text-truncate">
                    {{ author.displayname || displayname }}
                  </div>

                  <div
                    v-if="author.username"
                    class="text-caption text-medium-emphasis"
                  >
                    @{{ author.username }}
                  </div>
                </div>
              </div>

              <div
                v-if="author.bio"
                class="text-body-2 mt-2"
                style="
                  max-height: 6lh;
                  overflow: hidden;
                  text-overflow: ellipsis;
                "
              >
                {{ author.bio }}
              </div>

              <div class="d-flex align-center justify-end mt-3 gap-2">
                <v-btn
                  v-if="profileHref"
                  color="primary"
                  size="small"
                  :to="profileHref"
                  @click="peekOpen = false"
                >
                  View profile
                </v-btn>
              </div>
            </v-card>
          </v-menu>
          <!-- Fallback: no author object, render plain text -->
          <strong v-else class="text-body-2 text-blue-darken-4">
            {{ displayname }}
          </strong>

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
        <v-btn icon variant="text" density="comfortable" @click="onMenuClick">
          <v-icon size="18">mdi-dots-horizontal</v-icon>
        </v-btn>
      </div>

      <!-- Row B: body -->
      <div class="body text-body-2">
        <div v-if="parentName" class="text-caption text-medium-emphasis mb-1">
          replying to @{{ parentName }}
        </div>
        <div v-if="isTranslated && translationLabel" class="text-caption text-medium-emphasis mb-1">
          {{ translationLabel }}
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
          :id="id"
          target="message"
          :score="score"
          :my-vote="myVote"
          :disabled="disabled || senderKind === 'system'"
          @vote="(payload) => $emit('vote', payload)"
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
const emit = defineEmits(["reply", "vote", "menu", "login"]);

const props = defineProps({
  id: { type: String, required: true },
  depth: { type: Number, default: 0 }, // 0..2
  author: { type: Object, default: null },
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
  isTranslated: { type: Boolean, default: false },
  translationLabel: { type: String, default: null },
  isOp: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  canReply: { type: Boolean, default: true },
});

const activatorId = computed(() => `comment-menu-btn-${props.id}`);
const peekOpen = ref(false);
const indentPx = computed(
  () => `${Math.min(5, Math.max(0, Number(props.depth) || 0)) * 18}px`
);
const profileHref = computed(() => {
  const slug = props.author?.slug;
  const genderName = props.author?.gender?.name || "";
  if (!slug || !genderName) return null;

  // normalize gender (e.g. "Female" -> "female", "Non-Binary" -> "non-binary")
  const genderPath = genderName.toLowerCase().replace(/\s+/g, "-");
  return `/profiles/${genderPath}/${slug}`;
});

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
function onMenuClick(e) {
  // Ensure we pass the BUTTON, not an inner SVG/icon
  const btn =
    (e.currentTarget instanceof Element ? e.currentTarget : null) ||
    (e.target instanceof Element ? e.target.closest("button") : null);

  emit("menu", { id: props.id, el: btn || null });
}
</script>

<style scoped>
/* ── Card container (flat + tight) ─────────────────────────────────────────── */
.cmt {
  --indent: 0px; /* set via depth classes or inline style */
  position: relative;
  margin: 0; /* no gap between comments */
  border-radius: 0;
  box-shadow: none;
  background: transparent;
}

.cmt:hover {
  /* fallback first (works everywhere) */
  background-color: rgba(0, 0, 0, 0.04);
  /* prefer theme vars if available */
  background-color: rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.02);
}

/* Optional: a subtle left accent on hover for clarity */
.cmt:hover {
  outline: 1px solid rgba(var(--v-theme-on-surface-rgb, 0, 0, 0), 0.06);
  outline-offset: -1px;
}

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
.cmt--depth-0::before {
  display: none;
}

/* ── Row compaction (header / body / actions) ─────────────────────────────── */
.cmt .header,
.cmt .body,
.cmt .actions {
  margin: 0;
  padding: 0;
  line-height: 1.3;
}

/* tighten header ↔ body spacing */
.cmt .header {
  margin-bottom: 1px !important;
}
.cmt .body {
  margin-top: 0 !important;
  margin-bottom: 2px !important;
}

/* actions bar flush to bottom */
.cmt .actions {
  margin-top: 0;
  margin-bottom: 0;
}

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
  background: color-mix(
    in oklab,
    var(--v-theme-surface) 96%,
    var(--v-theme-primary) 4%
  );
}
.cmt--system {
  opacity: 0.85;
}

/* ── Small UI tweaks ─────────────────────────────────────────────────────── */
.v-chip {
  height: 18px;
  font-size: 0.7rem;
  padding: 0 4px;
}
.v-avatar {
  --v-avatar-size: 24px;
}

.avatar-with-icon {
  position: relative;
  margin-right: 8px;
}
.gender-icon {
  position: absolute;
  right: -7px;
  bottom: -2px;
  background: var(--v-theme-surface);
  border-radius: 50%;
  padding: 1px;
}

.position-relative {
  position: relative;
}

.absolute {
  position: absolute;
}

.top-2 {
  top: 0.5rem;
}

.right-2 {
  right: 0.5rem;
}
</style>
