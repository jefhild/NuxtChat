<template>
  <v-card class="consent-card" :color="cardColor" :rounded="rounded" :flat="flat">
    <div class="card-header">
      <div class="chip">
        <v-icon size="16" class="mr-1" :color="iconColor">{{ stateIcon }}</v-icon>
        <span>{{ stateLabel }}</span>
      </div>
      <div class="ml-auto d-flex align-center gap-1">
        <v-chip
          v-if="showStepChip"
          size="x-small"
          variant="tonal"
          color="primary"
          class="font-weight-semibold"
        >
          {{ stepLabel }}
        </v-chip>
        <v-btn
          v-if="showClose"
          icon
          variant="text"
          size="small"
          class="close-btn"
          @click="emit('close')"
        >
          <v-icon size="16">mdi-close</v-icon>
        </v-btn>
      </div>
    </div>

    <div class="card-body">
      <div class="body-title">{{ titleText }}</div>
      <div class="body-sub">{{ subtitleText }}</div>

      <v-progress-linear
        v-if="showProgress"
        :model-value="progress"
        color="primary"
        height="4"
        rounded
        class="mt-3"
      />

      <v-btn
        v-if="showCta"
        class="mt-3"
        block
        :color="ctaColor"
        :variant="ctaVariant"
        :to="ctaTo"
        :disabled="ctaDisabled"
        @click="onPrimary"
      >
        {{ ctaText }}
      </v-btn>

      <v-btn
        v-if="secondaryText"
        variant="text"
        color="primary"
        block
        class="mt-1"
        @click="emit('action')"
      >
        {{ secondaryText }}
      </v-btn>
    </div>
  </v-card>
</template>

<script setup>
import { computed, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";

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
        ctaText: "Accept terms & start",
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
    done: "Done",
  };
  return map[draft.stage] || "Get started";
});

const cardColor = computed(() => stateMeta.value.cardColor || props.color);
const iconColor = computed(() => stateMeta.value.iconColor || "primary");
const stateIcon = computed(() => stateMeta.value.icon);
const stateLabel = computed(() => stateMeta.value.label);

const displayName = computed(
  () => props.userProfile?.displayname || props.userProfile?.username || ""
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
const ctaColor = computed(() => stateMeta.value.ctaColor || "primary");
const ctaVariant = computed(() => (state.value === "ready" ? "tonal" : "flat"));
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

function onPrimary() {
  if (ctaTo.value) return; // navigation handled by router-link
  emit("action");
}
</script>

<style scoped>
.consent-card {
  padding: 8px 10px;
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
  background: rgba(0, 0, 0, 0.04);
  font-weight: 600;
  font-size: 13px;
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
  color: rgba(0, 0, 0, 0.8);
  margin-bottom: 0;
}
.body-sub {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.3;
}
.close-btn {
  min-width: 28px;
  height: 28px;
  align-self: flex-start;
  margin-top: -6px;
  margin-right: -6px;
}
</style>
