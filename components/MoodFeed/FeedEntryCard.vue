<template>
  <div class="mood-entry">
    <div class="mood-entry__header">
      <span class="mood-entry__avatar">
        <img :src="avatarUrl" alt="" />
      </span>
      <div class="mood-entry__meta">
        <div class="mood-entry__name">{{ displayName }}</div>
        <div class="mood-entry__sub">
          <span v-if="genderLabel">{{ genderLabel }}</span>
          <span v-if="genderLabel">·</span>
          <span>{{ formattedDate }}</span>
        </div>
      </div>
    </div>

    <div class="mood-entry__content">
      {{ entry.displayText }}
    </div>

    <div class="mood-entry__actions">
      <button
        type="button"
        class="mood-entry__action"
        :class="{ 'is-active': entry.userVote === 1 }"
        @click="emitVote(1)"
      >
        <i class="mdi mdi-thumb-up-outline" aria-hidden="true" />
        <span>{{ entry.upvotes || 0 }}</span>
      </button>
      <button
        type="button"
        class="mood-entry__action"
        :class="{ 'is-active is-negative': entry.userVote === -1 }"
        @click="emitVote(-1)"
      >
        <i class="mdi mdi-thumb-down-outline" aria-hidden="true" />
        <span>{{ entry.downvotes || 0 }}</span>
      </button>
      <button type="button" class="mood-entry__action mood-entry__action--reply" @click="$emit('reply', entry.id)">
        <i class="mdi mdi-reply-outline" aria-hidden="true" />
        <span>{{ entry.replyCount || 0 }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const props = defineProps({
  entry: { type: Object, required: true },
});

const emit = defineEmits(["vote", "reply"]);
const { t, locale } = useI18n();

const localizedProfile = computed(() =>
  resolveProfileLocalization({
    profile: props.entry.profile,
    readerLocale: locale?.value,
  })
);

const displayName = computed(
  () =>
    localizedProfile.value.displayname ||
    props.entry.profile?.displayname ||
    "Someone"
);

const avatarUrl = computed(() => props.entry.profile?.avatar_url || "");

const genderLabel = computed(() => {
  const gid = props.entry.profile?.gender_id;
  if (gid === 1) return t("onboarding.gender.male", "Male");
  if (gid === 2) return t("onboarding.gender.female", "Female");
  if (gid === 3) return t("onboarding.gender.other", "Other");
  return "";
});

const formattedDate = computed(() => {
  const raw = props.entry.createdAt;
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString();
});

function emitVote(value) {
  emit("vote", { entryId: props.entry.id, value });
}
</script>

<style scoped>
.mood-entry {
  padding: 12px 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  background: rgb(var(--color-surface));
}

.mood-entry__header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mood-entry__avatar {
  display: inline-flex;
  width: 36px;
  height: 36px;
  overflow: hidden;
  border-radius: 999px;
  border: 1px solid rgba(0, 0, 0, 0.06);
}

.mood-entry__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.mood-entry__meta {
  display: flex;
  flex-direction: column;
}

.mood-entry__name {
  font-weight: 600;
  font-size: 14px;
}

.mood-entry__sub {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.6);
  display: inline-flex;
  gap: 6px;
  align-items: center;
}

.mood-entry__content {
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.4;
}

.mood-entry__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.mood-entry__action {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0.3rem 0.6rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.72);
  font: inherit;
  font-size: 0.85rem;
  cursor: pointer;
}

.mood-entry__action:hover,
.mood-entry__action:focus-visible {
  background: rgb(var(--color-primary) / 0.1);
  outline: none;
}

.mood-entry__action.is-active {
  color: rgb(var(--color-primary));
}

.mood-entry__action.is-negative {
  color: #ef4444;
}

.mood-entry__action--reply {
  margin-left: auto;
}
</style>
