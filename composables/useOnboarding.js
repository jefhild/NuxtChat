// composables/useOnboarding.js
import { ref, computed } from "vue";
import { useOnboardingDraft } from "@/stores/onboardingDraftStore";
import { useOnboardingAi } from "~/composables/useOnboardingAi";

export function useOnboarding() {
  const draftStore = useOnboardingDraft();
  const { resume, sendUserMessage } = useOnboardingAi();

  // mirror old API
  const onboardingStep = computed(() => stepToIndex(draftStore.stage));
  const onboardingComplete = ref(false);
  const onboardingConsentGiven = computed(() => !!draftStore.consented);

  // optional: keep a “current question” string if the UI expects it
  const currentQuestion = computed(() => "");

  // called when user sends a message during onboarding
  async function validate(input) {
    const text = String(input ?? "").trim();
    if (!text) return { valid: false, error: "Empty message" };
    await sendUserMessage(text);
    return { valid: true };
  }

  // old API advanced to next question; keep as no-op or simply return
  async function advance() {
    if (draftStore.stage === "done") onboardingComplete.value = true;
    if (draftStore.stage === "collecting") await resume();
  }

  return {
    onboardingStep,
    onboardingComplete,
    onboardingConsentGiven,
    currentQuestion,
    // optional: expose the draft if UI needs it
    responses: draftStore.draft,
    validate,
    advance,
  };
}

// map your named steps to the index your old UI expects
function stepToIndex(step) {
  const order = ["idle", "consent", "collecting", "finalizing", "done"];
  return Math.max(0, order.indexOf(step));
}
