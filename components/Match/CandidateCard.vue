<template>
  <article class="candidate-card">
    <span class="status-dot" :class="statusDotClass" />

    <div class="candidate-card__body">
      <div class="candidate-card__top">
        <div class="avatar-stack" @click="onViewProfile">
          <div class="candidate-avatar" aria-hidden="true">
            <img
              v-if="candidate.avatar_url"
              :src="candidate.avatar_url"
              :alt="candidate.displayname"
              class="candidate-avatar__image"
            >
            <i v-else class="mdi mdi-account candidate-avatar__fallback" />
          </div>
          <span v-if="candidate.country_emoji" class="avatar-flag">
            {{ candidate.country_emoji }}
          </span>
          <span class="gender-badge" aria-hidden="true">
            <i
              :class="['mdi', getAvatarIcon(candidate.gender_id), 'candidate-gender-icon']"
              :style="{ '--candidate-gender-color': getGenderHexColor(candidate.gender_id) }"
            />
          </span>
        </div>

        <div class="candidate-card__identity">
          <button
            type="button"
            class="candidate-card__name"
            @click="onViewProfile"
          >
            {{ candidate.displayname || $t("components.candidateCard.anonymous") }}
          </button>
          <p
            v-if="candidate.tagline"
            class="candidate-card__tagline"
          >
            {{ candidate.tagline }}
          </p>
        </div>

        <div
          v-if="candidate.score"
          :class="['score-wrap', scoreToneClass]"
          :style="{ '--candidate-score-progress': `${scorePercent}%` }"
        >
          <div class="score-wrap__inner">
            {{ scorePercent }}
          </div>
        </div>
      </div>

      <div v-if="showMoodBadges" class="chip-row chip-row--mood">
        <span
          v-if="candidate.emotion"
          class="candidate-chip candidate-chip--secondary"
        >
          <i :class="['mdi', emotionIcon(candidate.emotion), 'candidate-chip__icon']" aria-hidden="true" />
          {{ $t(`match.emotion.${candidate.emotion}`, candidate.emotion) }}
        </span>
        <span
          v-if="candidate.intent"
          class="candidate-chip candidate-chip--primary"
        >
          <i class="mdi mdi-forum-outline candidate-chip__icon" aria-hidden="true" />
          {{ $t(`match.intent.${candidate.intent}`, candidate.intent) }}
        </span>
        <span
          v-if="candidate.energy"
          class="candidate-chip candidate-chip--warning"
        >
          <i :class="['mdi', energyIcon(candidate.energy), 'candidate-chip__icon']" aria-hidden="true" />
          {{ $t(`match.energy.${candidate.energy}`, candidate.energy) }}
        </span>
      </div>

      <div v-if="showLanguageBadges" class="language-chip-row">
        <span
          v-if="targetLanguageLabel"
          class="candidate-chip language-chip language-chip--target"
        >
          <i class="mdi mdi-translate candidate-chip__icon" aria-hidden="true" />
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
        </span>
        <span
          v-if="nativeLanguageLabel"
          class="candidate-chip language-chip language-chip--native"
        >
          <i class="mdi mdi-account-voice candidate-chip__icon" aria-hidden="true" />
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
        </span>
        <span
          v-if="candidate.correction_preference"
          class="candidate-chip language-chip language-chip--correction"
        >
          <i class="mdi mdi-pencil-outline candidate-chip__icon" aria-hidden="true" />
          {{
            $t(
              `match.language.correctionPreferences.${candidate.correction_preference}`,
              candidate.correction_preference
            )
          }}
        </span>
      </div>
    </div>

    <div class="candidate-card__actions">
      <button
        type="button"
        class="candidate-card__cta"
        @click="onChat"
      >
        <i
          :class="[
            'mdi',
            isAi ? 'mdi-robot-outline' : 'mdi-message-text-outline',
            'candidate-card__cta-icon',
          ]"
          aria-hidden="true"
        />
        {{ $t("components.candidateCard.chatWith", { name: candidate.displayname || $t("components.candidateCard.anonymous") }) }}
      </button>
    </div>
  </article>
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

const scorePercent = computed(() =>
  Math.max(0, Math.min(100, Math.round((props.candidate.score ?? 0) * 100)))
);

const scoreToneClass = computed(() => {
  const s = props.candidate.score ?? 0;
  if (s >= 0.7) return "score-wrap--success";
  if (s >= 0.4) return "score-wrap--warning";
  return "score-wrap--neutral";
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
  display: flex;
  flex-direction: column;
  min-height: 100%;
  border: 1px solid rgb(var(--color-border) / 0.72);
  border-radius: 14px;
  background: rgb(var(--color-surface));
  box-shadow: 0 10px 24px rgb(var(--color-shadow) / 0.08);
  transition: box-shadow 0.15s ease, transform 0.15s ease, border-color 0.15s ease;
}

.candidate-card:hover {
  transform: translateY(-2px);
  border-color: rgb(var(--color-primary) / 0.24);
  box-shadow: 0 14px 28px rgb(var(--color-shadow) / 0.12);
}

.candidate-card__body {
  padding: 0.9rem;
}

.candidate-card__top {
  display: flex;
  align-items: center;
  gap: 0.85rem;
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

.status-dot--online { background-color: #4caf50; }
.status-dot--agent { background-color: #7c3aed; }
.status-dot--offline { background-color: #90a4ae; }

.avatar-stack {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  cursor: pointer;
}

.candidate-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  background: rgb(var(--color-surface-2, var(--color-surface)));
  overflow: hidden;
}

.candidate-avatar__image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.candidate-avatar__fallback {
  font-size: 1.35rem;
  color: rgb(var(--color-foreground) / 0.52);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
}

.candidate-gender-icon {
  font-size: 1.15rem;
  color: var(--candidate-gender-color, #a855f7);
}

.candidate-card__identity {
  min-width: 0;
  flex: 1;
  margin-left: 6px;
}

.candidate-card__name {
  display: inline-block;
  max-width: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: rgb(var(--color-primary));
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.35;
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
}

.candidate-card__tagline {
  margin: 0.1rem 0 0;
  overflow: hidden;
  color: rgb(var(--color-foreground) / 0.68);
  font-size: 0.92rem;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.score-wrap {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 999px;
  background:
    conic-gradient(var(--score-color) var(--candidate-score-progress), rgb(var(--color-border) / 0.5) 0);
}

.score-wrap__inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  font-size: 0.72rem;
  font-weight: 700;
}

.score-wrap--success { --score-color: #22c55e; }
.score-wrap--warning { --score-color: #f59e0b; }
.score-wrap--neutral { --score-color: rgb(var(--color-foreground) / 0.45); }

.chip-row,
.language-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 7px;
  align-items: flex-start;
  margin-top: 0.65rem;
}

.candidate-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 24px;
  padding: 0.28rem 0.6rem;
  border: 1px solid var(--chip-border, rgb(var(--color-border) / 0.4));
  border-radius: 999px;
  background: var(--chip-bg, rgb(var(--color-primary) / 0.08));
  color: var(--chip-text, rgb(var(--color-foreground) / 0.84));
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.2;
}

.candidate-chip__icon {
  color: var(--chip-icon, currentColor);
  font-size: 0.82rem;
}

.candidate-chip--primary {
  --chip-bg: rgb(var(--color-primary) / 0.14);
  --chip-border: rgb(var(--color-primary) / 0.28);
  --chip-text: rgb(var(--color-primary));
}

.candidate-chip--secondary {
  --chip-bg: rgb(var(--color-secondary) / 0.14);
  --chip-border: rgb(var(--color-secondary) / 0.28);
  --chip-text: rgb(var(--color-secondary));
}

.candidate-chip--warning {
  --chip-bg: rgb(245 158 11 / 0.14);
  --chip-border: rgb(245 158 11 / 0.28);
  --chip-text: #d97706;
}

.language-chip {
  flex: 0 1 auto;
}

.language-chip--target {
  --chip-bg: rgba(34, 197, 94, 0.14);
  --chip-border: rgba(34, 197, 94, 0.34);
  --chip-icon: #22c55e;
}

.language-chip--native {
  --chip-bg: rgba(56, 189, 248, 0.14);
  --chip-border: rgba(56, 189, 248, 0.34);
  --chip-icon: #38bdf8;
}

.language-chip--correction {
  --chip-bg: rgba(129, 140, 248, 0.16);
  --chip-border: rgba(129, 140, 248, 0.36);
  --chip-icon: #a5b4fc;
}

.candidate-card__actions {
  padding: 0 0.9rem 0.9rem;
}

.candidate-card__cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  min-height: 38px;
  padding: 0.6rem 0.8rem;
  border: 0;
  border-radius: 10px;
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary));
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.3;
  cursor: pointer;
  transition: background-color 0.15s ease, transform 0.15s ease;
}

.candidate-card__cta:hover,
.candidate-card__cta:focus-visible {
  background: rgb(var(--color-primary) / 0.18);
  transform: translateY(-1px);
  outline: none;
}

.candidate-card__cta-icon {
  font-size: 1rem;
}
</style>
