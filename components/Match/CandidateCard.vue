<template>
  <v-card class="candidate-card" :elevation="2" rounded="lg">
    <!-- Status dot: green=online, purple=away agent, grey=offline -->
    <span class="status-dot" :class="statusDotClass" />

    <v-card-text class="pa-3">
      <div class="d-flex align-center gap-3">
        <!-- Avatar with flag + gender badge overlay (matches HomeProfiles style) -->
        <div class="avatar-stack" @click="onViewProfile">
          <v-avatar size="48" color="surface-variant" class="cursor-pointer">
            <v-img v-if="candidate.avatar_url" :src="candidate.avatar_url" :alt="candidate.displayname" />
            <v-icon v-else icon="mdi-account" />
          </v-avatar>
          <span v-if="candidate.country_emoji" class="avatar-flag">
            {{ candidate.country_emoji }}
          </span>
          <v-avatar size="28" color="transparent" class="gender-badge">
            <v-icon
              size="18"
              class="candidate-gender-icon"
              :style="{ '--candidate-gender-color': getGenderHexColor(candidate.gender_id) }"
              :icon="getAvatarIcon(candidate.gender_id)"
            />
          </v-avatar>
        </div>

        <div class="flex-grow-1 overflow-hidden" style="margin-left: 6px;">
          <div class="d-flex align-center gap-1">
            <span
              class="text-body-1 font-weight-medium text-truncate cursor-pointer text-primary"
              style="text-decoration: underline; text-underline-offset: 2px;"
              @click="onViewProfile"
            >
              {{ candidate.displayname || $t("components.candidateCard.anonymous") }}
            </span>
          </div>
          <p
            v-if="candidate.tagline"
            class="text-body-2 text-medium-emphasis text-truncate mt-0 mb-0"
          >
            {{ candidate.tagline }}
          </p>
        </div>

        <!-- Match score bar -->
        <div v-if="candidate.score" class="score-wrap text-center">
          <v-progress-circular
            :model-value="Math.round(candidate.score * 100)"
            :color="scoreColor"
            size="36"
            width="3"
          >
            <span class="text-caption font-weight-bold">{{ Math.round(candidate.score * 100) }}</span>
          </v-progress-circular>
        </div>
      </div>

      <!-- Mood badges -->
      <div v-if="showMoodBadges" class="d-flex flex-wrap gap-1 mt-2">
        <v-chip
          v-if="candidate.emotion"
          size="x-small"
          variant="tonal"
          color="secondary"
          :prepend-icon="emotionIcon(candidate.emotion)"
        >
          {{ $t(`match.emotion.${candidate.emotion}`, candidate.emotion) }}
        </v-chip>
        <v-chip
          v-if="candidate.intent"
          size="x-small"
          variant="tonal"
          color="primary"
          prepend-icon="mdi-forum-outline"
        >
          {{ $t(`match.intent.${candidate.intent}`, candidate.intent) }}
        </v-chip>
        <v-chip
          v-if="candidate.energy"
          size="x-small"
          variant="tonal"
          color="warning"
          :prepend-icon="energyIcon(candidate.energy)"
        >
          {{ $t(`match.energy.${candidate.energy}`, candidate.energy) }}
        </v-chip>
      </div>

      <!-- Language practice badges -->
      <div v-if="showLanguageBadges" class="language-chip-row mt-2">
        <v-chip
          v-if="targetLanguageLabel"
          class="language-chip language-chip--target"
          size="x-small"
          variant="tonal"
          prepend-icon="mdi-translate"
        >
          {{
            $t(
              isAi
                ? "components.candidateCard.aiHelpingLanguage"
                : "components.candidateCard.practicingLanguage",
              {
                language: targetLanguageLabel,
              }
            )
          }}
        </v-chip>
        <v-chip
          v-if="nativeLanguageLabel"
          class="language-chip language-chip--native"
          size="x-small"
          variant="tonal"
          prepend-icon="mdi-account-voice"
        >
          {{
            $t(
              isAi
                ? "components.candidateCard.aiSupportLanguage"
                : "components.candidateCard.nativeLanguage",
              {
                language: nativeLanguageLabel,
              }
            )
          }}
        </v-chip>
        <v-chip
          v-if="candidate.correction_preference"
          class="language-chip language-chip--correction"
          size="x-small"
          variant="tonal"
          prepend-icon="mdi-pencil-outline"
        >
          {{
            $t(
              `match.language.correctionPreferences.${candidate.correction_preference}`,
              candidate.correction_preference
            )
          }}
        </v-chip>
      </div>
    </v-card-text>

    <v-card-actions class="px-3 pt-0 pb-3">
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        block
        :prepend-icon="isAi ? 'mdi-robot-outline' : 'mdi-message-text-outline'"
        @click="onChat"
      >
        {{ $t("components.candidateCard.chatWith", { name: candidate.displayname || $t("components.candidateCard.anonymous") }) }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup>
import { computed } from "vue";
import { getAvatarIcon, getGenderHexColor } from "@/composables/useUserUtils";
import { useI18n } from "vue-i18n";

const props = defineProps({
  candidate: {
    type: Object,
    required: true,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  isAi: {
    type: Boolean,
    default: false,
  },
  context: {
    type: String,
    default: "mood",
  },
});

const emit = defineEmits(["chat", "view-profile"]);
const { t } = useI18n();

const candidateNativeLanguages = computed(() => {
  const values = Array.isArray(props.candidate.supported_native_languages)
    ? props.candidate.supported_native_languages
    : [];
  return values.length ? values : [props.candidate.native_language_code].filter(Boolean);
});

const candidateTargetLanguages = computed(() => {
  const values = Array.isArray(props.candidate.supported_target_languages)
    ? props.candidate.supported_target_languages
    : [];
  return values.length ? values : [props.candidate.target_language_code].filter(Boolean);
});

const formatLanguageLabel = (codes) =>
  codes
    .filter(Boolean)
    .map((code) => t(`match.language.languages.${code}`, code))
    .join(", ");

const nativeLanguageLabel = computed(() =>
  formatLanguageLabel(candidateNativeLanguages.value)
);

const targetLanguageLabel = computed(() =>
  formatLanguageLabel(candidateTargetLanguages.value)
);

const statusDotClass = computed(() => {
  if (props.isOnline) return "status-dot--online";
  if (props.candidate.agent_enabled) return "status-dot--agent";
  return "status-dot--offline";
});

const scoreColor = computed(() => {
  const s = props.candidate.score ?? 0;
  if (s >= 0.7) return "success";
  if (s >= 0.4) return "warning";
  return "default";
});

const hasLanguageBadges = computed(
  () =>
    candidateTargetLanguages.value.length > 0 ||
    candidateNativeLanguages.value.length > 0 ||
    !!props.candidate.correction_preference
);

const showMoodBadges = computed(
  () =>
    props.context !== "language" &&
    (!!props.candidate.emotion || !!props.candidate.intent || !!props.candidate.energy)
);

const showLanguageBadges = computed(
  () => props.context === "language" && hasLanguageBadges.value
);

function emotionIcon(emotion) {
  const map = {
    lonely: "mdi-emoticon-sad-outline",
    calm: "mdi-emoticon-neutral-outline",
    annoyed: "mdi-emoticon-angry-outline",
    overwhelmed: "mdi-emoticon-frown-outline",
    playful: "mdi-emoticon-excited-outline",
    curious: "mdi-emoticon-cool-outline",
    hopeful: "mdi-emoticon-happy-outline",
    sad: "mdi-emoticon-cry-outline",
  };
  return map[emotion] ?? "mdi-emoticon-outline";
}

function energyIcon(energy) {
  const map = {
    drained: "mdi-battery-low",
    normal: "mdi-battery-medium",
    wired: "mdi-battery-high",
  };
  return map[energy] ?? "mdi-battery-outline";
}

function onViewProfile() {
  emit("view-profile", props.candidate);
}

function onChat() {
  emit("chat", props.candidate);
}
</script>

<style scoped>
.candidate-card {
  position: relative;
  transition: box-shadow 0.15s ease, transform 0.15s ease;
}

.candidate-card:hover {
  transform: translateY(-2px);
}

.status-dot {
  position: absolute;
  top: 9px;
  right: 9px;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  z-index: 1;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.35);
}

.status-dot--online  { background-color: #4caf50; }
.status-dot--agent   { background-color: #7c3aed; }
.status-dot--offline { background-color: #90a4ae; }

.avatar-stack {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
}

.avatar-flag {
  position: absolute;
  left: -6px;
  top: 2px;
  font-size: 1.3rem;
  line-height: 1;
  text-shadow: 0 1px 3px rgba(2, 6, 23, 0.75);
  z-index: 2;
}

.gender-badge {
  position: absolute;
  left: -8px;
  bottom: -8px;
  --v-avatar-background: transparent;
  background: transparent !important;
  box-shadow: none !important;
}

.gender-badge :deep(.v-avatar__underlay),
.gender-badge :deep(.v-avatar__content) {
  background: transparent !important;
}

.gender-badge :deep(.v-icon) {
  background: transparent !important;
}

.candidate-gender-icon {
  color: var(--candidate-gender-color, #a855f7) !important;
}

.language-chip-row {
  display: flex;
  flex-wrap: wrap;
  column-gap: 7px;
  row-gap: 6px;
  align-items: flex-start;
}

.language-chip {
  flex: 0 1 auto;
  border: 1px solid var(--language-chip-border, rgba(148, 163, 184, 0.2));
  background: var(--language-chip-bg, rgba(148, 163, 184, 0.12)) !important;
  color: var(--language-chip-text, rgba(var(--v-theme-on-surface), 0.84)) !important;
  min-height: 24px;
  padding-inline: 8px 10px !important;
  overflow: visible;
}

.language-chip :deep(.v-icon) {
  color: var(--language-chip-icon, currentColor) !important;
  margin-inline-end: 5px;
}

.language-chip--target {
  --language-chip-bg: rgba(34, 197, 94, 0.14);
  --language-chip-border: rgba(34, 197, 94, 0.34);
  --language-chip-icon: #22c55e;
}

.language-chip--native {
  --language-chip-bg: rgba(56, 189, 248, 0.14);
  --language-chip-border: rgba(56, 189, 248, 0.34);
  --language-chip-icon: #38bdf8;
}

.language-chip--correction {
  --language-chip-bg: rgba(129, 140, 248, 0.16);
  --language-chip-border: rgba(129, 140, 248, 0.36);
  --language-chip-icon: #a5b4fc;
}

.score-wrap {
  flex-shrink: 0;
}
</style>
