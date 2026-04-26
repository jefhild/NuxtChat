<template>
  <div :class="['consent-card', `consent-card--${state}`]">
    <div class="card-header">
      <div class="chip">
        <i :class="chipIconClass" aria-hidden="true" />
        <span>{{ stateLabel }}</span>
      </div>
      <div class="ml-auto flex items-center gap-1">
        <span v-if="showStepChip" class="step-chip">
          {{ stepLabel }}
        </span>
        <button
          v-if="showClose"
          type="button"
          class="close-btn"
          @click="emit('close')"
        >
          <i class="mdi mdi-close text-base" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="card-body">
      <div class="body-title">{{ titleText }}</div>
      <div class="body-sub">{{ subtitleText }}</div>

      <div
        v-if="showProgress"
        class="consent-progress mt-3"
        role="progressbar"
        aria-valuemin="0"
        aria-valuemax="100"
        :aria-valuenow="progress"
      >
        <div class="consent-progress__bar" :style="{ width: `${progress}%` }" />
      </div>

      <NuxtLink
        v-if="showCta && ctaTo"
        :to="ctaTo"
        :class="['mt-3 consent-cta consent-cta--link', ctaToneClass]"
        :aria-disabled="String(ctaDisabled)"
        @click="ctaDisabled && $event.preventDefault()"
      >
        {{ ctaText }}
      </NuxtLink>

      <button
        v-if="showCta"
        class="mt-3 consent-cta"
        :class="ctaToneClass"
        v-show="!ctaTo"
        :disabled="ctaDisabled"
        @click="onPrimary"
      >
        {{ ctaText }}
      </button>

      <button
        v-if="secondaryText"
        type="button"
        class="mt-1 consent-secondary"
        @click="emit('action')"
      >
        {{ secondaryText }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";
import { resolveProfileLocalization } from "@/composables/useProfileLocalization";

const props = defineProps({
  authStatus: { type: String, default: "unauthenticated" },
  line1: { type: String, default: null },
  line2: { type: String, default: null },
  clickable: { type: Boolean, default: true },
  actionLabel: { type: String, default: "" },
  color: { type: String, default: "grey-lighten-4" },
  rounded: { type: [Boolean, String, Number], default: "lg" },
  flat: { type: Boolean, default: true },
  userProfile: { type: Object, default: null },
  settingsTo: { type: String, default: "/settings" },
  showClose: { type: Boolean, default: false },
});

const emit = defineEmits(["action", "close"]);
const { t } = useI18n();
const draft = useOnboardingDraftStore();

onMounted(() => draft.loadLocal?.());

const state = computed(() => {
  if (props.authStatus === "authenticated") return "ready";
  if (props.authStatus === "anon_authenticated") return "linkEmail";
  if (props.authStatus === "guest" || props.authStatus === "onboarding")
    return "onboarding";
  return "consent";
});

const stateMeta = computed(() => {
  switch (state.value) {
    case "consent":
      return {
        label: "Consent needed",
        icon: "mdi-lock",
        iconColor: "primary",
        cardColor: "primary-lighten-5",
        ctaText: t("components.chatheader.consent-cta"),
        ctaColor: "primary",
      };
    case "onboarding":
      return {
        label: "Finish onboarding",
        icon: "mdi-rocket-launch-outline",
        iconColor: "primary",
        cardColor: "primary-lighten-5",
        ctaText: "Resume onboarding",
        ctaColor: "primary",
      };
    case "linkEmail":
      return {
        label: "Link your email",
        icon: "mdi-email-plus-outline",
        iconColor: "primary",
        cardColor: "blue-grey-lighten-5",
        ctaText: "Link email",
        ctaColor: "primary",
      };
    case "ready":
    default:
      return {
        label: "All set",
        icon: "mdi-check-circle-outline",
        iconColor: "success",
        cardColor: "green-lighten-5",
        ctaText: t("components.chatheader.settings"),
        ctaColor: "success",
      };
  }
});

const stageProgress = computed(() => {
  const total = 5;
  const pct = Math.round((completedSteps.value / total) * 100);
  return Math.max(0, Math.min(100, pct));
});
const stageLabel = computed(() => {
  const map = {
    idle: "Get started",
    consent: "Consent",
    collecting: "Basics",
    confirm: "Confirm",
    finalizing: "Saving",
    done: "Done",
  };
  return map[draft.stage] || "Get started";
});

const stateIcon = computed(() => stateMeta.value.icon);
const stateLabel = computed(() => stateMeta.value.label);

const { locale } = useI18n();
const localized = computed(() =>
  resolveProfileLocalization({
    profile: props.userProfile,
    readerLocale: locale?.value,
  })
);
const displayName = computed(
  () =>
    localized.value.displayname ||
    props.userProfile?.displayname ||
    props.userProfile?.username ||
    ""
);

const displayNameFilled = computed(
  () => !!(draft.displayName && String(draft.displayName).trim().length)
);
const bioFilled = computed(
  () => !!(draft.bio && String(draft.bio).trim().length)
);
const genderFilled = computed(() => draft.genderId != null);

const titleText = computed(() => {
  if (props.line1) return props.line1;
  if (state.value === "consent") return "";
  if (state.value === "onboarding") return "";
  if (state.value === "linkEmail") return "";
  if (state.value === "ready") return displayName.value || stateLabel.value;
  return stateLabel.value;
});

const totalSteps = 5; // consent + displayName + age + gender + bio
const completedSteps = computed(() => {
  let n = 0;
  if (draft.consented) n += 1;
  if (displayNameFilled.value) n += 1;
  if (draft.age != null) n += 1;
  if (genderFilled.value) n += 1;
  if (bioFilled.value) n += 1;
  return n;
});

const currentStep = computed(() => {
  if (!draft.consented) return "consent";
  if (!displayNameFilled.value) return "displayName";
  if (draft.age == null) return "age";
  if (!genderFilled.value) return "gender";
  if (!bioFilled.value) return "bio";
  return "done";
});

const stepSubtitleKey = computed(() =>
  currentStep.value ? `components.onboardingSteps.${currentStep.value}` : null
);
const stepSubtitleFallback = {
  consent: "Step 1 of 5: Accept terms to get started.",
  displayName: "Step 2 of 5: Choose your display name.",
  age: "Step 3 of 5: Share your age.",
  gender: "Step 4 of 5: Share your gender.",
  bio: "Step 5 of 5: Add a short bio.",
  done: "Profile complete.",
};

const subtitleText = computed(() => {
  if (props.line2) return props.line2;
  if (state.value === "consent" || state.value === "onboarding") {
    const key = stepSubtitleKey.value;
    const fb = stepSubtitleFallback[currentStep.value] || "";
    if (key) return t(key, fb);
    return fb || t(`components.chatheader.${props.authStatus}-line2`);
  }
  return t(`components.chatheader.${props.authStatus}-line2`);
});

const ctaText = computed(() => stateMeta.value.ctaText);
const ctaTo = computed(() =>
  state.value === "ready" || state.value === "linkEmail" ? props.settingsTo : null
);
const showCta = computed(() => {
  if (state.value === "ready") return false;
  // Hide "Resume onboarding" once consented so it doesn't show for post-consent onboarding state
  if (state.value === "onboarding" && draft.consented) return false;
  return true;
});
const ctaDisabled = computed(() => {
  if (!props.clickable) return true;
  // After consent, let the chat composer drive onboarding; keep this button inert.
  if (state.value === "onboarding" && draft.consented) return true;
  return false;
});

const showStepChip = computed(() => state.value !== "ready");
const stepLabel = computed(() => stageLabel.value);
const showProgress = computed(
  () => state.value === "onboarding" || state.value === "consent"
);
const progress = computed(() => stageProgress.value);
const secondaryText = computed(() => props.actionLabel || "");

const chipIconClass = computed(() => [
  "mdi",
  stateIcon.value,
  "mr-1 text-base",
  state.value === "ready" ? "consent-icon--success" : "consent-icon--primary",
]);

const ctaToneClass = computed(() =>
  state.value === "ready" ? "consent-cta--ready" : "consent-cta--primary"
);

function onPrimary() {
  if (ctaTo.value) return; // navigation handled by router-link
  emit("action");
}
</script>

<style scoped>
.consent-card {
  padding: 6px 8px;
  background: #1e293b !important;
  color: #e2e8f0 !important;
  border: 1px solid rgba(148, 163, 184, 0.38);
  border-radius: 12px;
}

.consent-card--linkEmail {
  border-color: rgba(148, 163, 184, 0.44);
  background: linear-gradient(180deg, rgba(30, 41, 59, 0.98), rgba(15, 23, 42, 0.98));
}

.consent-card--ready {
  border-color: rgba(34, 197, 94, 0.3);
  background: linear-gradient(180deg, rgba(21, 128, 61, 0.18), rgba(15, 23, 42, 0.95));
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 4px;
  position: relative;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
  font-weight: 600;
  font-size: 13px;
}

.step-chip {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.16);
  color: #bfdbfe;
  font-size: 11px;
  font-weight: 600;
}

.card-body {
  margin-top: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0 0 0;
}
.body-title {
  font-weight: 700;
  font-size: 14px;
  color: #f8fafc;
  margin-bottom: 0;
}
.body-sub {
  font-size: 13px;
  color: #cbd5e1;
  line-height: 1.3;
}
.close-btn {
  width: 28px;
  height: 28px;
  align-self: flex-start;
  margin-top: -6px;
  margin-right: -6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #cbd5e1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgba(148, 163, 184, 0.12);
}

.consent-progress {
  width: 100%;
  height: 4px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(148, 163, 184, 0.22);
}

.consent-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #60a5fa, #818cf8);
}

.consent-cta {
  font-size: clamp(12px, 2.8vw, 14px);
  line-height: 1.2;
  min-height: 36px;
  white-space: normal;
  text-align: center;
  width: 100%;
  border-radius: 10px;
  padding: 0.7rem 0.9rem;
  font-weight: 600;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.consent-cta--primary {
  background: #3b82f6;
  color: #eff6ff;
}

.consent-cta--ready {
  background: rgba(34, 197, 94, 0.16);
  border-color: rgba(34, 197, 94, 0.3);
  color: #dcfce7;
}

.consent-cta:disabled,
.consent-cta[aria-disabled="true"] {
  opacity: 0.55;
  cursor: default;
}

.consent-secondary {
  width: 100%;
  border: 0;
  background: transparent;
  color: #93c5fd;
  padding: 0.35rem 0;
  font-size: 0.875rem;
}

.consent-icon--primary {
  color: #93c5fd;
}

.consent-icon--success {
  color: #4ade80;
}
</style>
