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
        label: t("components.consentPanel.state.consent"),
        icon: "mdi-lock",
        iconColor: "primary",
        cardColor: "primary-lighten-5",
        ctaText: t("components.chatheader.consent-cta"),
        ctaColor: "primary",
      };
    case "onboarding":
      return {
        label: t("components.consentPanel.state.onboarding"),
        icon: "mdi-rocket-launch-outline",
        iconColor: "primary",
        cardColor: "primary-lighten-5",
        ctaText: t("components.consentPanel.cta.resume"),
        ctaColor: "primary",
      };
    case "linkEmail":
      return {
        label: t("components.consentPanel.state.linkEmail"),
        icon: "mdi-email-plus-outline",
        iconColor: "primary",
        cardColor: "blue-grey-lighten-5",
        ctaText: t("components.consentPanel.cta.linkEmail"),
        ctaColor: "primary",
      };
    case "ready":
    default:
      return {
        label: t("components.consentPanel.state.ready"),
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
    idle: t("components.consentPanel.stage.idle"),
    consent: t("components.consentPanel.stage.consent"),
    collecting: t("components.consentPanel.stage.collecting"),
    confirm: t("components.consentPanel.stage.confirm"),
    finalizing: t("components.consentPanel.stage.finalizing"),
    done: t("components.consentPanel.stage.done"),
  };
  return map[draft.stage] || t("components.consentPanel.stage.idle");
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
  padding: 0.45rem 0.5rem;
  background: linear-gradient(
    180deg,
    rgb(var(--color-surface) / 0.96),
    rgb(var(--color-surface-elevated) / 0.94)
  ) !important;
  color: rgb(var(--color-foreground)) !important;
  border: 1px solid rgb(var(--color-border) / 0.48);
  border-radius: 14px;
  box-shadow: 0 10px 22px rgb(var(--color-shadow) / 0.1);
}

.consent-card--linkEmail {
  border-color: rgb(var(--color-secondary) / 0.26);
}

.consent-card--ready {
  border-color: rgb(var(--color-success) / 0.28);
  background: linear-gradient(
    180deg,
    rgb(var(--color-success) / 0.12),
    rgb(var(--color-surface-elevated) / 0.95)
  ) !important;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 2px;
  position: relative;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
  background: rgb(var(--color-surface-elevated) / 0.72);
  color: rgb(var(--color-foreground));
  font-weight: 600;
  font-size: 0.72rem;
  border: 1px solid rgb(var(--color-border) / 0.55);
}

.step-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.48rem;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.14);
  color: rgb(var(--color-secondary));
  font-size: 0.64rem;
  font-weight: 600;
}

.card-body {
  margin-top: 2px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 2px 0 0 0;
}
.body-title {
  font-weight: 700;
  font-size: 0.82rem;
  color: rgb(var(--color-heading));
  margin-bottom: 0;
}
.body-sub {
  font-size: 0.74rem;
  color: rgb(var(--color-muted));
  line-height: 1.35;
}
.close-btn {
  width: 24px;
  height: 24px;
  align-self: flex-start;
  margin-top: -6px;
  margin-right: -6px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-muted));
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: rgb(var(--color-primary) / 0.08);
}

.consent-progress {
  width: 100%;
  height: 3px;
  border-radius: 999px;
  overflow: hidden;
  background: rgb(var(--color-border) / 0.28);
}

.consent-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgb(var(--color-secondary)), rgb(var(--color-primary)));
}

.consent-cta {
  font-size: clamp(11px, 2.4vw, 13px);
  line-height: 1.2;
  min-height: 32px;
  white-space: normal;
  text-align: center;
  width: 100%;
  border-radius: 10px;
  padding: 0.52rem 0.8rem;
  font-weight: 600;
  border: 1px solid transparent;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.consent-cta--primary {
  background: rgb(var(--color-primary));
  color: rgb(var(--color-primary-foreground));
}

.consent-cta--ready {
  background: rgb(var(--color-success) / 0.14);
  border-color: rgb(var(--color-success) / 0.28);
  color: rgb(var(--color-success));
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
  color: rgb(var(--color-secondary));
  padding: 0.2rem 0;
  font-size: 0.78rem;
}

.consent-icon--primary {
  color: rgb(var(--color-secondary));
}

.consent-icon--success {
  color: rgb(var(--color-success));
}
</style>
