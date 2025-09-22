// composables/useOnboarding.js
import { ref, computed } from "vue";
import { useAuthStore } from "@/stores/authStore1"; // NEW store
import { useOnboardingDraft } from "@/stores/onboardingDraftStore"; // your chosen name
import { useOnboardingAgent } from "~/composables/useOnboardingAgent_bak"; // new

export function useOnboarding() {
  const auth = useAuthStore();
  const draftStore = useOnboardingDraft();
  const agent = useOnboardingAgent(); // returns handleUserMessage, step machine, etc.

  // mirror old API
  const onboardingStep = computed(() => stepToIndex(draftStore.step));
  const onboardingComplete = ref(false);
  const onboardingConsentGiven = ref(false);

  // optional: keep a “current question” string if the UI expects it
  const currentQuestion = computed(() => {
    switch (draftStore.step) {
      case "start":
        return "👋 Welcome to ImChatty! Ready to set up your profile?";
      case "name":
        return "What would you like to use as your pseudonym?";
      case "age":
        return "How old are you?";
      case "gender":
        return "Are you a man, a woman, or something else?";
      case "status":
        return "Are you married, single, separated, or something else?";
      case "review":
        return "Review your info and confirm to save.";
      default:
        return "";
    }
  });

  // called when user sends a message during onboarding
  async function validate(input) {
    // first message: mark consent and create anon user
    if (draftStore.step === "start" && !onboardingConsentGiven.value) {
      onboardingConsentGiven.value = true;
      try {
        await auth.ensureAnonymousUserAfterConsent();
      } catch (e) {
        return { valid: false, error: "Couldn’t start session. Try again?" };
      }
    }

    // delegate step routing to the agent
    const reply = await agent.handleUserMessage(String(input ?? "").trim());
    // you can return reply to render a bot message immediately if your UI expects it
    return { valid: true, reply };
  }

  // old API advanced to next question; keep as no-op or simply return
  async function advance() {
    if (draftStore.step === "done") {
      onboardingComplete.value = true;
    }
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
  const order = [
    "start",
    "name",
    "age",
    "gender",
    "status",
    "review",
    "commit",
    "done",
  ];
  return Math.max(0, order.indexOf(step) - 1); // your old code started at -1
}
