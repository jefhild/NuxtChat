// composables/useOnboardingFlow.js
import { watchEffect } from "vue";
import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useAuthStore } from "~/stores/authStore1";
import { useChatStore } from "~/stores/chatStore"; // must provide chat.addMessage({ role, text, name? })

export function useOnboardingFlow() {
  const draft = useOnboardingDraftStore();
  const auth = useAuthStore();
  const chat = useChatStore();

  // --- Chat helpers ---
  function bot(text) {
    chat?.addMessage?.({ role: "ai", name: "imchatty", text });
  }
  // if you need to echo the user's message, enable below
  // function userEcho(text) { chat?.addMessage?.({ role: 'user', text }) }

  // --- Public API ---
  function init() {
    draft.loadLocal();

    if (draft.stage === "idle") draft.setStage("consent");

    if (draft.stage === "consent") {
      const haveAny = !!(
        draft.displayName ||
        draft.age ||
        draft.genderId ||
        draft.bio
      );
      if (haveAny) {
        const parts = [];
        if (draft.displayName) parts.push(`display name: ${draft.displayName}`);
        if (draft.age != null) parts.push(`age: ${draft.age}`);
        if (draft.genderId != null)
          parts.push(`gender: ${genderIdToLabel(draft.genderId)}`);
        if (draft.bio) parts.push(`bio: present`);
        bot(
          `Hey! It looks like you already started a profile: ${parts.join(
            ", "
          )}. Shall we continue? (yes/no)`
        );
      } else {
        bot(
          `Hi! I’m imchatty 🤖. Do you consent to a few quick questions to create your profile? (yes/no)`
        );
      }
    }
  }

  async function handleUserMessage(input) {
    const text = (input || "").trim();
    const low = text.toLowerCase();

    // Stage: consent
    if (draft.stage === "consent") {
      if (isYes(low)) {
        draft.setConsent(true);
        draft.setStage("collecting");
        askNextMissing();
      } else if (isNo(low)) {
        draft.clearAll();
        bot(
          `No problem. I’ve cleared your onboarding data. You can start again anytime.`
        );
      } else {
        bot(`Please reply "yes" or "no" to continue.`);
      }
      return;
    }

    // Stage: collecting
    if (draft.stage === "collecting") {
      const next = draft.missingFields[0];
      if (!next) {
        draft.setStage("confirm");
        return askConfirm();
      }

      switch (next) {
        case "displayName": {
          const name = extractDisplayName(text);
          if (!name) return bot(`What would you like your display name to be?`);
          draft.setField("displayName", name);
          return askNextMissing();
        }
        case "age": {
          const age = extractAge(text);
          if (!age || age < 18 || age > 120)
            return bot(`What’s your age? (numbers only, must be 18+)`);
          draft.setField("age", age);
          return askNextMissing();
        }
        case "genderId": {
          const gid = extractGenderId(text); // map label/number → id
          if (!gid) return bot(`What’s your gender? (male/female/other)`);
          draft.setField("genderId", gid);
          return askNextMissing();
        }
        case "bio": {
          const bio = text.trim();
          if (!bio || bio.length < 10)
            return bot(`Write a short bio (at least 10 characters).`);
          draft.setField("bio", bio);
          return askNextMissing();
        }
      }
    }

    // Stage: confirm
    if (draft.stage === "confirm") {
      if (isYes(low)) {
        try {
          await saveProfileToSupabase();
          draft.setStage("done");
          bot(`All set! Your profile is created. Welcome 🎉`);
        } catch (e) {
          bot(
            `I couldn’t save your profile yet: ${
              e?.message || "unknown error"
            }. Say "retry" to try again.`
          );
        }
      } else if (isNo(low)) {
        bot(
          `Okay—what would you like to change? You can say "change name to Jeff", "set age 43", "gender female", or "bio ..."`
        );
        draft.setStage("collecting");
      } else if (/save|retry/i.test(text)) {
        try {
          await saveProfileToSupabase();
          draft.setStage("done");
          bot(`Saved!`);
        } catch (e) {
          bot(`Still couldn’t save: ${e?.message || "unknown error"}.`);
        }
      } else {
        bot(`Please reply "yes" to save, or "no" to make changes.`);
      }
      return;
    }
  }

  // --- flow helpers ---
  function askNextMissing() {
    const next = draft.missingFields[0];
    if (!next) return askConfirm();
    if (next === "displayName")
      bot(`Great—what would you like your display name to be?`);
    else if (next === "age") bot(`How old are you?`);
    else if (next === "genderId")
      bot(`What’s your gender? (male/female/other)`);
    else if (next === "bio") bot(`Tell me a short bio about yourself.`);
  }

  function askConfirm() {
    const { displayName, age, genderId, bio } = draft;
    const genderLabel = genderIdToLabel(genderId);
    bot(
      `Here’s what I’ve got:\n- Name: ${displayName}\n- Age: ${age}\n- Gender: ${genderLabel}\n- Bio: ${bio}\nSave this? (yes/no)`
    );
  }

  // --- parsing helpers ---
  function isYes(t) {
    return /^(y|yes|sure|ok|okay|oui)\b/.test(t);
  }
  function isNo(t) {
    return /^(n|no|non|nope)\b/.test(t);
  }

  function extractAge(input) {
    const m = input.match(/(\d{1,3})/);
    if (!m) return null;
    const n = parseInt(m[1], 10);
    return Number.isFinite(n) ? n : null;
  }

  function extractDisplayName(input) {
    const t = input.replace(/^my\s+name\s+is\s+/i, "").trim();
    return t.length >= 3 ? t : null;
  }

  function extractGenderId(input) {
    const t = input.toLowerCase();
    if (/\b(male|man|homme|masculin)\b/.test(t)) return 1;
    if (/\b(female|woman|femme|féminin)\b/.test(t)) return 2;
    if (/\b(other|nonbinary|nb|autre)\b/.test(t)) return 3;
    const n = parseInt(t, 10);
    return Number.isFinite(n) ? n : null;
  }

  function genderIdToLabel(id) {
    if (id === 1) return "male";
    if (id === 2) return "female";
    if (id === 3) return "other";
    return "—";
  }

  // --- persistence to Supabase (defensive to your existing store API) ---
  async function saveProfileToSupabase() {
    // Normalize payload to snake_case the DB likely expects
    const payload = {
      displayname: draft.displayName,
      age: draft.age,
      gender_id: draft.genderId,
      bio: draft.bio,
    };

    // Try preferred single-step method if it exists
    if (typeof auth.finalizeOnboarding === "function") {
      await auth.finalizeOnboarding(payload);
      draft.clearAll();
      return;
    }

    // Fallback: ensure anon, then upsert via available method name
    if (typeof auth.signInAnonymously === "function") {
      await auth.signInAnonymously();
    } else if (typeof auth.ensureAnonymousUserAfterConsent === "function") {
      await auth.ensureAnonymousUserAfterConsent();
    }

    if (typeof auth.createOrUpdateProfile === "function") {
      await auth.createOrUpdateProfile(payload);
    } else if (typeof auth.upsertProfileFromDraft === "function") {
      await auth.upsertProfileFromDraft(payload);
    } else {
      throw new Error("No profile upsert method found in auth store");
    }

    draft.clearAll();
  }

  // Optional: if user logs in mid-flow and everything is ready, you could auto-save
  watchEffect(() => {
    if (
      draft.stage === "collecting" &&
      draft.isComplete &&
      auth?.authStatus === "authenticated"
    ) {
      // you could call saveProfileToSupabase() here if desired
    }
  });

  return { init, handleUserMessage };
}
