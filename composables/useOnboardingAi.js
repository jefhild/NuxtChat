import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useAuthStore } from "~/stores/authStore1";
import { useChatStore } from "~/stores/chatStore";
import { useDb } from "@/composables/useDB";
import { useAiQuota } from "@/composables/useAiQuota";
import { useI18n } from "vue-i18n";
import { useTypingStore } from "@/stores/typingStore";
import { useLocalePath } from "#imports";

// const localePath = useLocalePath() // if run on client/setup
// const settingsUrl = localePath('/settings') // e.g. /fr/settings

// Global handler the UI registers (ChatLayoutOnboarding sets this)
let __onBotMessage = (payload) => {
  const text = typeof payload === "string" ? payload : payload?.text;
};
let __finalizeInFlight = false;
export function setOnboardingBotMessageHandler(fn) {
  if (typeof fn === "function") __onBotMessage = fn;
}

export function useOnboardingAi() {
  const { locale, t } = useI18n();
  const localePath = useLocalePath();
  const draft = useOnboardingDraftStore(); 
  const auth = useAuthStore();
  const chat = useChatStore();
  const db = useDb();
  const typingStore = useTypingStore();
  // const { tryConsume } = useAiQuota();

  const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
  const MOOD_MAX_ATTEMPTS = 3;

  const normalizeLocale = (value) => {
    const code = String(value || "").trim().toLowerCase();
    if (!code) return "en";
    if (code.startsWith("zh")) return "zh";
    if (code.startsWith("fr")) return "fr";
    if (code.startsWith("ru")) return "ru";
    return "en";
  };

  const YES_WORDS = {
    en: ["yes", "y", "yeah", "yep", "sure", "ok", "okay"],
    fr: ["oui", "o", "d'accord", "ok"],
    ru: ["да", "ок", "ok", "хорошо"],
    zh: ["是", "好", "好的", "行", "可以", "ok"],
  };
  const NO_WORDS = {
    en: ["no", "n", "nope", "nah"],
    fr: ["non", "n"],
    ru: ["нет", "не"],
    zh: ["不", "不是", "不对", "不行", "不可以"],
  };

  const shouldCollectMoodFeed = () =>
    Boolean(
      auth.user?.id || auth.session?.user?.id || auth.userProfile?.user_id
    );
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isMoodFeedActive = () =>
    shouldCollectMoodFeed() &&
    draft.moodFeedStage &&
    draft.moodFeedStage !== "done";

  function ensureBotSelected() {
    chat.initializeDefaultUser(auth.authStatus);
  }
  function pushBotMessage(payload) {
    try {
      __onBotMessage(payload);
    } catch {
      const text = typeof payload === "string" ? payload : payload?.text;
    }
  }

  function logDraft(tag) {
    // console.log(`[onboarding][${tag}]`, {
    //   consented: draft.consented,
    //   summary: {
    //     displayName: draft.displayName,
    //     age: draft.age,
    //     genderId: draft.genderId,
    //     bio: draft.bio,
    //   },
    //   missing: draft.missingFields,
    //   isComplete: draft.isComplete,
    // });
  }

  async function applyActions(actions = []) {
    logDraft("before-apply");

    let sawSet = false;
    let sawBot = false;
    let sawFinalize = false;

    // normalize keys coming from the server to match your draft store
    const normalizeKey = (raw) => {
      const k = String(raw ?? "").trim();
      switch (k) {
        case "displayname":
          return "displayName";
        case "gender_id":
          return "genderId";
        // already correct:
        case "displayName":
        case "age":
        case "genderId":
        case "bio":
        case "tagline":
          return k;
        default:
          return k; // let unknowns pass through (harmless with setField guard)
      }
    };

    for (const a of actions || []) {
      if (!a || !a.type) continue;

      // ---- bot_message ----
      if (a.type === "bot_message" && a.text) {
        pushBotMessage({ text: a.text, quickReplies: a.quickReplies });
        sawBot = true;
        continue;
      }

      // ---- set_consent ----
      if (a.type === "set_consent") {
        const v = !!a.value;
        if (typeof draft.setConsent === "function") draft.setConsent(v);
        else draft.consented = v;
        auth.setOnboardingLocal(true);
        if (auth?.ensureAnonymousUserAfterConsent) {
          await auth.ensureAnonymousUserAfterConsent();
        }
        // console.log("[onboarding][consent]", { consented: draft.consented });
        continue;
      }

      // ---- set_field ----
      if (a.type === "set_field") {
        const key = normalizeKey(a.key);
        let val = a.value;

        // Coerce only numeric fields; never mutate displayName/bio text here
        if (key === "age") {
          const n = Number(val);
          if (!Number.isNaN(n)) val = n;
        }

        if (key === "genderId") {
          // accept 1/2/3 or male/female/other
          const map = { 1: 1, 2: 2, 3: 3, male: 1, female: 2, other: 3 };
          const norm = String(val).trim().toLowerCase();
          const mapped =
            map[norm] ?? (Number.isFinite(Number(norm)) ? Number(norm) : null);
          val = mapped ?? null;
        }

        if (typeof draft.setField === "function") {
          // your store should already guard allowed keys
          draft.setField(key, val);
        } else {
          draft[key] = val;
        }
        // console.log("[onboarding][set_field]", { key, value: val });
        sawSet = true;
        continue;
      }

      // ---- finalize ----
      if (a.type === "finalize") {
        if (
          __finalizeInFlight ||
          draft.stage === "finalizing" ||
          draft.stage === "done"
        ) {
          sawFinalize = true;
          continue;
        }
        await handleFinalize();
        sawFinalize = true;
        continue;
      }
    }

    logDraft("after-apply");

    // 🔁 Auto-fetch the next prompt if we set a field but didn’t get a prompt or finalize
    if (sawSet && !sawBot && !sawFinalize) {
      try {
        if (typeof resume === "function") {
          await resume(); // should call your API with { resume: true }
        }
      } catch (e) {
      }
    }
  }

  async function performFinalize() {
    if (__finalizeInFlight) return;
    const {
      public: { IMCHATTY_ID },
    } = useRuntimeConfig();
    __finalizeInFlight = true;
    if (typeof draft.setStage === "function") draft.setStage("finalizing");
    else draft.stage = "finalizing";
    draft.setField?.("handoffPending", true);
    draft.setField?.("moodFeedStage", "done");
    const pendingLanguagePracticeIntent =
      draft.languagePracticeIntent && typeof draft.languagePracticeIntent === "object"
        ? { ...draft.languagePracticeIntent }
        : null;
    // Block any parallel mood-prompt auto-trigger while finalize + welcome
    // sequencing is still in progress.
    draft.setField?.("moodFeedDeferUntil", Date.now() + 7000);
    try {
      await auth.finalizeOnboarding({
        displayname: draft.displayName,
        age: draft.age,
        gender_id: draft.genderId,
        bio: draft.bio,
        tagline: draft.tagline,
        country_id: draft.countryId ?? null,
        state_id: draft.stateId ?? null,
        city_id: draft.cityId ?? null,
        ip: draft.ip ?? null,
      });

      const receiverId =
        auth.userProfile?.user_id ??
        auth.session?.user?.id ??
        auth.user?.id ??
        null;

      const { insertMessage } = useDb();
      if (IMCHATTY_ID && receiverId && typeof insertMessage === "function") {
        const rawName =
          draft.displayName ??
          auth.userProfile?.displayname ??
          auth.session?.user?.user_metadata?.displayname ??
          "";

        const rawBio = draft.bio ?? "";

        const display =
          String(rawName)
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 40) || "there";
        const handoffOk = await startPostOnboardingHandoff(receiverId, {
          display,
          rawBio,
          languagePracticeIntent: pendingLanguagePracticeIntent,
        });

        if (!handoffOk) {
          // Persona selection failed — fall back to ImChatty so the user
          // at least lands in an active conversation.
          try {
            typingStore.set(IMCHATTY_ID, true);
            await new Promise((resolve) => setTimeout(resolve, 900));
            await insertMessage(
              receiverId,
              IMCHATTY_ID,
              t("onboarding.handoffFallbackMessage", { display })
            );
            chat.addActivePeer?.(IMCHATTY_ID);
            await chat.fetchChatUsers?.();
            chat.setSelectedUser?.(IMCHATTY_ID);
          } catch (fallbackErr) {
            console.warn("[bot-handoff] fallback to ImChatty failed:", fallbackErr?.message || fallbackErr);
          } finally {
            typingStore.clear(IMCHATTY_ID);
          }
        }
      }

      if (typeof draft.setStage === "function") draft.setStage("done");
      else draft.stage = "done";

      if (typeof ensureBotSelected === "function") {
        try {
          ensureBotSelected();
        } catch {}
      }
    } catch (err) {
      if (typeof draft.setStage === "function") draft.setStage("collecting");
      else draft.stage = "collecting";
      if (typeof pushBotMessage === "function") {
        pushBotMessage(
          "Hmm, I couldn’t finish saving your profile. Please try again from Settings."
        );
      }
    } finally {
      draft.setField?.("handoffPending", false);
      __finalizeInFlight = false;
    }
  }

  function getYesLabel() {
    return t("onboarding.yes", "Yes");
  }
  function getNoLabel() {
    return t("onboarding.no", "No");
  }

  function getLiveMoodOpener() {
    const fallbacks = [
      "How are you feeling right now?",
      "What are you feeling right now?",
      "What kind of mood are you in?",
      "How's your mood right now?",
      "What feels closest to your mood right now?",
    ];
    const translated = t("onboarding.liveMoodOpeners", fallbacks);
    const options = Array.isArray(translated)
      ? translated
      : Array.isArray(fallbacks)
      ? fallbacks
      : [fallbacks];
    const cleaned = options
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
    if (!cleaned.length) return fallbacks[0];
    const index = Math.floor(Math.random() * cleaned.length);
    return cleaned[index] || fallbacks[0];
  }

  function isYes(text) {
    const norm = String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!norm) return false;
    const localeKey = normalizeLocale(locale.value);
    const list = new Set([
      getYesLabel().toLowerCase(),
      ...(YES_WORDS[localeKey] || []),
    ]);
    return list.has(norm);
  }

  function isNo(text) {
    const norm = String(text || "")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]+/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!norm) return false;
    const localeKey = normalizeLocale(locale.value);
    const list = new Set([
      getNoLabel().toLowerCase(),
      ...(NO_WORDS[localeKey] || []),
    ]);
    return list.has(norm);
  }

  async function ensureMoodFeedPrompt() {
    if (draft.moodFeedPrompt && String(draft.moodFeedPrompt).trim()) {
      return draft.moodFeedPrompt;
    }
    try {
      const res = await $fetch("/api/mood-feed/prompts/random", {
        query: { locale: locale.value },
      });
      if (res?.promptText) {
        draft.setField?.("moodFeedPrompt", res.promptText);
        if (res.promptKey) {
          draft.setField?.("moodFeedPromptKey", res.promptKey);
        }
        return res.promptText;
      }
    } catch {}
    return "";
  }

  const formatMoodPrompt = (text) => {
    const trimmed = String(text || "").trim();
    return trimmed ? `**${trimmed}**` : "";
  };

  async function startMoodFeedPrompt() {
    const prompt = await ensureMoodFeedPrompt();
    if (!prompt) return false;
    draft.setField?.("moodFeedStage", "prompt");
    pushBotMessage({ text: formatMoodPrompt(prompt) });
    return true;
  }

  async function refineMoodFeedResponse(text) {
    const trimmed = String(text || "").trim();
    if (!trimmed) return;
    let refined = trimmed;
    const prompt = await ensureMoodFeedPrompt();
    try {
      const res = await $fetch("/api/mood-feed/refine", {
        method: "POST",
        body: {
          prompt,
          response: trimmed,
          locale: locale?.value || "en",
        },
      });
      if (res?.refined) refined = String(res.refined).trim() || trimmed;
    } catch {
      refined = trimmed;
    }

    const attempts = Number(draft.moodFeedAttempts || 0) + 1;
    draft.setField?.("moodFeedAttempts", attempts);
    draft.setField?.("moodFeedAnswer", trimmed);
    draft.setField?.("moodFeedRefined", refined);
    draft.setField?.("moodFeedStage", "confirm");

    const confirmText = t("onboarding.moodFeed.confirm", { text: refined });
    pushBotMessage({
      text: confirmText,
      quickReplies: [getYesLabel(), getNoLabel()],
    });
  }

  async function createMoodFeedEntry(status) {
    try {
      const payload = {
        promptText: draft.moodFeedPrompt || null,
        promptKey: draft.moodFeedPromptKey || null,
        originalText: draft.moodFeedAnswer || null,
        refinedText: draft.moodFeedRefined || draft.moodFeedAnswer || "",
        status,
        locale: locale?.value || "en",
      };
      await $fetch("/api/mood-feed/entries", {
        method: "POST",
        body: payload,
      });
      return true;
    } catch (e) {
      console.warn("[mood-feed] create entry failed:", e?.message || e);
      return false;
    }
  }

  async function acceptMoodFeed() {
    const ok = await createMoodFeedEntry("published");
    draft.setField?.("moodFeedStage", "done");
    draft.setField?.("moodFeedStatus", ok ? "published" : "pending_validation");
    if (ok) {
      pushBotMessage({
        text: t("onboarding.moodFeed.accepted", { feedUrl: localePath("/feeds") }),
      });
    } else {
    pushBotMessage({
      text: t("onboarding.moodFeed.saveFailed"),
    });
    }
    await performFinalize();
  }

  async function queueMoodFeedForValidation() {
    await createMoodFeedEntry("pending_validation");
    draft.setField?.("moodFeedStage", "done");
    draft.setField?.("moodFeedStatus", "pending_validation");
    pushBotMessage({
      text: t("onboarding.moodFeed.needsValidation"),
    });
    await performFinalize();
  }

  async function handleFinalize() {
    await performFinalize();
  }

  async function handleMoodFeedMessage(text) {
    if (!isMoodFeedActive()) return false;

    const stage = draft.moodFeedStage || "idle";
    if (stage === "prompt") {
      await refineMoodFeedResponse(text);
      return true;
    }

    if (stage === "confirm") {
      if (isYes(text)) {
        await acceptMoodFeed();
        return true;
      }
      if (isNo(text)) {
        if ((draft.moodFeedAttempts || 0) >= MOOD_MAX_ATTEMPTS) {
          await queueMoodFeedForValidation();
          return true;
        }
        draft.setField?.("moodFeedStage", "prompt");
        pushBotMessage({
          text: t("onboarding.moodFeed.rephrase"),
        });
        return true;
      }

      // Treat other input as a new response
      if ((draft.moodFeedAttempts || 0) >= MOOD_MAX_ATTEMPTS) {
        await queueMoodFeedForValidation();
        return true;
      }
      await refineMoodFeedResponse(text);
      return true;
    }

    return false;
  }

  async function callApi(body) {
    try {
      const { actions = [] } = await $fetch("/api/aiOnboarding", {
        method: "POST",
        body: {
          locale: locale?.value || "en",
          ...body,
        },
      });
      // console.log("[onboarding][api->actions]", actions);
      return actions;
    } catch (e) {
      return [{ type: "bot_message", text: "Sorry, a hiccup—try again." }];
    }
  }

  async function resume() {
    // Optional: keep if your UI needs the AI bot selected
    if (typeof ensureBotSelected === "function") {
      try {
        ensureBotSelected();
      } catch {}
    }

    // Never down-grade consent here (don’t gate on auth status)
    const consentFlag = !!draft.consented;

    // Recompute missing fields on the client so it's always fresh
    const required = ["displayName", "age", "genderId", "bio"];
    const isEmptyStr = (v) =>
      typeof v === "string" ? v.trim().length === 0 : false;

    const summary = {
      displayName: draft.displayName ?? null,
      age: draft.age ?? null,
      genderId: draft.genderId ?? null,
      bio: typeof draft.bio === "string" ? draft.bio : "",
      tagline: typeof draft.tagline === "string" ? draft.tagline : "",
    };

    const missing = required.filter((k) => {
      const v = summary[k];
      if (k === "displayName" || k === "bio") return v == null || isEmptyStr(v);
      if (k === "age" || k === "genderId")
        return v == null || Number.isNaN(Number(v));
      return v == null;
    });

    const payload = {
      messages: [], // resume: ask "what's next?" (no new user text)
      resume: true,
      consented: consentFlag,
      draftSummary: summary, // camelCase, as your server expects
      missingFields: missing, // camelCase list
      isComplete: missing.length === 0,
    };

    // callApi returns the array directly (not wrapped), per your signature
    const actions = await callApi(payload);
    if (Array.isArray(actions) && actions.length) {
      await applyActions(actions);
    }
  }

  async function sendUserMessage(userText, options = {}) {
    ensureBotSelected();

    const { tryConsume, getDailyLimit, limitReachedMessage } = useAiQuota();
    const captchaToken =
      options && typeof options === "object" ? options.captchaToken : undefined;

    const text = typeof userText === "string" ? userText.trim() : "";
    if (!text) return; // avoid sending empty messages that cause re-prompts

    // Mirror normal chat UX: show my bubble immediately in the ephemeral thread.
    try {
      draft.appendThreadMessage?.({
        from: "me",
        text,
        ts: Date.now(),
      });
    } catch {
      /* non-blocking */
    }

    // console.info(
    //   "[onboarding] consented:",
    //   !!draft.consented,
    //   "authStatus:",
    //   auth.authStatus,
    //   "userId:",
    //   auth.user?.id
    // );

    // ✅ Enforce quota ONLY after consent + when we have a user id
    const hasConsent = !!draft.consented;
    const hasUserId = !!(auth.user?.id || auth.user?.user_id);

    if (hasConsent && hasUserId) {
      const limit = getDailyLimit();

      const { allowed, used, remaining } = await tryConsume();

      // if (!allowed) {
      //   const msg = limitReachedMessage(auth.authStatus, limit);
      //   const meId = auth.user?.id;
      //   const peerId = chat.selectedUser?.user_id || chat.selectedUser?.id;
      //   const isImChatty = peerId === IMCHATTY_ID;

      //   // 1) Show in the CURRENT thread (instant feedback)
      //   // regRef.value?.appendPeerLocal?.(msg);
      //   await applyActions([{ type: "bot_message", text: msg }]);

      //   // 2) Persist in the CURRENT bot thread (bot -> me)
      //   if (!isImChatty)
      //     try {
      //       await insertMessage(meId, peerId, msg); // receiver=me, sender=current bot
      //     } catch (e) {
      //       console.error("[AI LIMIT] persist (current thread) failed", e);
      //     }

      //   // 3) Also persist in IMCHATTY thread (bot -> me), but DO NOT switch UI
      //   try {
      //     // Only do this if ImChatty exists in your users[] list
      //     const imchatty = chat.getUserById?.(IMCHATTY_ID);
      //     if (imchatty) {
      //       await insertMessage(meId, IMCHATTY_ID, msg); // receiver=me, sender=ImChatty
      //       chat.addActivePeer?.(IMCHATTY_ID); // optional: surface in “active”
      //     }
      //   } catch (e) {
      //     console.error("[AI LIMIT] persist (ImChatty thread) failed", e);
      //   }

      //   return;
      // }


if (!allowed) {
  const msg = limitReachedMessage(auth.authStatus, limit);
  const meId = auth.user?.id;
  const peerId = chat.selectedUser?.user_id || chat.selectedUser?.id;
  const isImChatty = peerId === IMCHATTY_ID;

  // 1) Show in the CURRENT onboarding UI
  await applyActions([{ type: "bot_message", text: msg }]);

  // 2) Persist only when NOT already in ImChatty (onboarding is ImChatty, so this is usually skipped)
  if (!isImChatty && meId && peerId) {
    try {
      await db.insertMessage(meId, peerId, msg); // current thread
    } catch (e) {
    }
  }

  // 3) Also persist in ImChatty only if current thread isn’t ImChatty
  if (!isImChatty && meId) {
    try {
      await db.insertMessage(meId, IMCHATTY_ID, msg); // ImChatty
      chat.addActivePeer?.(IMCHATTY_ID);
    } catch (e) {
    }
  }

  return;
}


    } else {
      // Before consent (or no uid yet): skip quota entirely so onboarding can proceed.
    }

    if (await handleMoodFeedMessage(text)) {
      return;
    }

    const required = ["displayName", "age", "genderId", "bio"];
    const summary = {
      displayName: draft.displayName ?? null,
      age: draft.age ?? null,
      genderId: draft.genderId ?? null,
      bio: typeof draft.bio === "string" ? draft.bio : "",
      tagline: typeof draft.tagline === "string" ? draft.tagline : "",
    };
    const missing = required.filter((k) => {
      const v = summary[k];
      if (k === "displayName" || k === "bio")
        return v == null || String(v).trim().length === 0;
      if (k === "age" || k === "genderId")
        return v == null || Number.isNaN(Number(v));
      return v == null;
    });


    const actions = await callApi({
      messages: [{ role: "user", content: text }], // <-- the actual user bio
      consented: !!draft.consented, // <-- don’t gate on auth status
      draftSummary: summary,
      missingFields: missing,
      isComplete: missing.length === 0,
      ...(captchaToken ? { captchaToken } : {}),
      // resume: false  // <-- do NOT include resume on a send
    });

    await applyActions(actions);
  }


  

  async function startPostOnboardingHandoff(
    receiverId,
    { display = "", rawBio = "", languagePracticeIntent = null } = {}
  ) {
    if (!receiverId) return false;
    if ((draft.liveMoodStage || "idle") !== "idle") return false;

    const { insertMessage } = useDb();
    const currentProfile = auth.userProfile || {};
    const currentUser = auth.user || auth.session?.user || {};
    const lookingFor = Array.isArray(currentProfile?.looking_for)
      ? currentProfile.looking_for.filter(Boolean)
      : [];
    const nudges = {
      nudge_add_photo: !currentProfile?.avatar_url,
      nudge_link_email: !(currentUser?.email && currentUser?.email_confirmed_at),
      nudge_set_looking_for: lookingFor.length === 0,
      nudge_open_settings:
        !currentProfile?.avatar_url ||
        lookingFor.length === 0 ||
        !(currentUser?.email && currentUser?.email_confirmed_at),
    };
    let handoff = null;
    try {
      const res = await $fetch("/api/bot/handoff", {
        method: "POST",
        body: {
          displayname: display || null,
          bio: rawBio || null,
          locale: locale?.value || "en",
          nudges,
        },
      });
      handoff = res?.handoff || null;
    } catch (err) {
      console.warn("[bot-handoff] create failed:", err?.message || err);
      return false;
    }

    const personaKey = String(handoff?.personaKey || "").trim();
    const personaProfile = handoff?.profile || null;
    const personaUserId = String(personaProfile?.user_id || "").trim();
    const personaName =
      String(personaProfile?.displayname || personaKey || "Someone").trim() ||
      "Someone";
    const personaAvatarUrl = String(personaProfile?.avatar_url || "").trim();
    if (!personaKey || !personaUserId) return false;

    const moodPrompt = getLiveMoodOpener();
    const languagePracticeTarget = String(
      languagePracticeIntent?.target_language_code || ""
    )
      .trim()
      .toLowerCase();
    const languageLabelKey = languagePracticeTarget
      ? `match.language.languages.${languagePracticeTarget}`
      : "";
    const localizedLanguageName = languageLabelKey ? t(languageLabelKey) : "";
    const targetLanguageName =
      localizedLanguageName && localizedLanguageName !== languageLabelKey
        ? localizedLanguageName
        : languagePracticeTarget
        ? languagePracticeTarget.toUpperCase()
        : "";
    const hasLanguagePracticeIntent = Boolean(languagePracticeTarget);
    const opener = hasLanguagePracticeIntent
      ? t("onboarding.languagePractice.postSignupOpener", {
          name: display || "there",
          personaName,
          language: targetLanguageName,
        })
      : `Hey ${display || "there"}, I'm ${personaName}. Your profile is live — you can start browsing and chatting right now. Or if you want, answer one quick question and I'll find people who actually match your vibe. ${moodPrompt}`;

    draft.setField?.("moodFeedStage", "done");
    draft.setField?.("liveMoodStage", hasLanguagePracticeIntent ? "done" : "prompt");
    draft.setField?.("liveMoodPersonaKey", personaKey);
    draft.setField?.("liveMoodPersonaUserId", personaUserId);
    draft.setField?.("liveMoodPersonaDisplayName", personaName);
    draft.setField?.("liveMoodPersonaAvatarUrl", personaAvatarUrl || "");
    draft.setField?.("liveMoodPrompt", moodPrompt);
    draft.setField?.("liveMoodInput", "");
    draft.setField?.("liveMoodCandidate", null);
    draft.setField?.("liveMoodNudges", nudges);
    draft.setField?.(
      "liveMoodNextStepStage",
      hasLanguagePracticeIntent ? "language_practice" : "idle"
    );
    draft.setField?.(
      "postOnboardingLanguagePracticeContext",
      hasLanguagePracticeIntent
        ? {
            native_language_code:
              languagePracticeIntent?.native_language_code || null,
            target_language_code: languagePracticeTarget,
            target_language_level:
              languagePracticeIntent?.target_language_level || null,
          }
        : null
    );
    draft.setField?.("handoffPending", false);

    let typingTimer = null;
    try {
      typingStore.set(personaUserId, true);
      await new Promise((resolve) => {
        typingTimer = setTimeout(resolve, 900);
      });
      await insertMessage(receiverId, personaUserId, opener);
      chat.addActivePeer?.(personaUserId);
      // Set selection BEFORE fetchChatUsers so the rebind logic preserves it.
      // Pass the profile object directly — avoids getUserById failing if the
      // persona hasn't been loaded into users.value yet.
      chat.setSelectedUser?.(personaProfile);
      await chat.fetchChatUsers?.();
    } catch (err) {
      console.warn("[bot-handoff] message insert failed:", err?.message || err);
      return false;
    } finally {
      if (typingTimer) clearTimeout(typingTimer);
      typingStore.clear(personaUserId);
    }

    return true;
  }

  return { resume, sendUserMessage };
}
