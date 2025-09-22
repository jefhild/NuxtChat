// composables/useOnboardingOrchestrator.js
import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useAuthStore } from "~/stores/authStore1";
import { useChatStore } from "~/stores/chatStore";

/**
 * Orchestrates onboarding:
 * - sendUserMessage(text): user replies → server returns actions → apply to stores
 * - resume(): after refresh, ask AI for the next question from current draft
 *
 * All bot messages are *ephemeral* until unlock. No writes to `messages` here.
 */
export function useOnboardingOrchestrator() {
  const draft = useOnboardingDraftStore(); // fields, missingFields, isComplete, consented, localStorage persistence.
  const auth = useAuthStore(); // ensureAnonymousUserAfterConsent, finalizeOnboarding.
  const chat = useChatStore(); // keeps ImChatty injected/selected for pre-auth.

  // —— UI hook to show ephemeral bot messages in the chat pane ——
  // You can replace these no-ops with an emitter, or a local messages array in Chat view.
  function pushBotMessage(text) {
    // e.g. eventBus.emit('imchatty:bot_message', { text })
    // or store into a reactive messages[] in your chat panel
    console.debug("[onboarding] bot_message:", text);
  }

  async function applyActions(actions = []) {
    for (const a of actions) {
      if (a.type === "bot_message" && a.text) {
        pushBotMessage(a.text);
      }

      if (a.type === "set_consent") {
        draft.setConsent(!!a.value); // local flag persists to localStorage.
        // Create/refresh a clean anonymous session right away
        await auth.ensureAnonymousUserAfterConsent(); // fixes stale sub-claims, prepares anon session.
      }

      if (a.type === "set_field") {
        // Keys: displayName | age | genderId | bio
        draft.setField(a.key, a.value); // coercion for age/genderId already handled.
        if (draft.stage === "idle" || draft.stage === "consent")
          draft.setStage("collecting");
      }

      if (a.type === "finalize") {
        // Only finalize when draft is actually complete
        if (draft.isComplete) {
          // computed guards all required fields + consent.
          // Map to profile payload expected by authStore1.upsertProfileFromDraft
          const payload = {
            displayname: draft.displayName,
            age: draft.age,
            gender_id: draft.genderId,
            bio: draft.bio,
          };
          await auth.finalizeOnboarding(payload); // persists + loads profile; flips to anon_authenticated.
          draft.setStage("done");
          pushBotMessage(
            `🎉 All set, ${draft.displayName}! You can now message people.`
          );

          // (Optional) Seed a first real message from ImChatty via your messages API
          // to create an inaugural thread post-unlock. Keep it for later if desired.
        } else {
          // Not complete: ask for what’s missing next time
          const need = draft.missingFields[0];
          pushBotMessage(nextQuestionFallback(need));
        }
      }
    }
  }

  function nextQuestionFallback(key) {
    if (key === "displayName") return "What display name should we show?";
    if (key === "age") return "How old are you? (18+ only)";
    if (key === "genderId") return "Pick a gender: 1=male, 2=female, 3=other";
    if (key === "bio") return "Write a short bio (1–2 sentences).";
    return "Let’s confirm your details—ready to finalize?";
  }

  // Ensure ImChatty is selected during pre-auth (directory still shows everyone)
  function ensureBotSelected() {
    chat.initializeDefaultUser(auth.authStatus); // chooses ImChatty for unauth/guest/onboarding.
  }

  async function resume() {
    ensureBotSelected();
    const body = {
      resume: true,
      consented: draft.consented,
      draftSummary: draft.summary, // {displayName,age,genderId,bio}.
      missingFields: draft.missingFields,
      isComplete: draft.isComplete,
    };
    const { actions } = await $fetch("/api/ai/onboarding", {
      method: "POST",
      body,
    });
    await applyActions(actions);
  }

  async function sendUserMessage(text) {
    ensureBotSelected();
    const body = {
      messages: [{ role: "user", content: text }],
      consented: draft.consented,
      draftSummary: draft.summary,
      missingFields: draft.missingFields,
      isComplete: draft.isComplete,
    };
    const { actions } = await $fetch("/api/ai/onboarding", {
      method: "POST",
      body,
    });
    await applyActions(actions);
  }

  return { resume, sendUserMessage };
}
