<template>
  <v-card class="mood-entry" elevation="1">
    <div class="mood-entry__header">
      <v-avatar size="36" class="mood-entry__avatar">
        <img :src="avatarUrl" alt="" />
      </v-avatar>
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
      <v-btn
        size="small"
        variant="text"
        :color="entry.userVote === 1 ? 'primary' : undefined"
        @click="emitVote(1)"
      >
        <v-icon size="18">mdi-thumb-up-outline</v-icon>
        <span class="ml-1">{{ entry.upvotes || 0 }}</span>
      </v-btn>
      <v-btn
        size="small"
        variant="text"
        :color="entry.userVote === -1 ? 'error' : undefined"
        @click="emitVote(-1)"
      >
        <v-icon size="18">mdi-thumb-down-outline</v-icon>
        <span class="ml-1">{{ entry.downvotes || 0 }}</span>
      </v-btn>
      <v-spacer />
      <v-btn size="small" variant="text" @click="$emit('reply', entry.id)">
        <v-icon size="18">mdi-reply-outline</v-icon>
        <span class="ml-1">{{ entry.replyCount || 0 }}</span>
      </v-btn>
    </div>
  </v-card>
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
}
.mood-entry__header {
  display: flex;
  align-items: center;
  gap: 10px;
}
.mood-entry__avatar {
  border: 1px solid rgba(0, 0, 0, 0.06);
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
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
