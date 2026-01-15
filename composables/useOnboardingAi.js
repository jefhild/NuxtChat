import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useAuthStore } from "~/stores/authStore1";
import { useChatStore } from "~/stores/chatStore";
import { useDb } from "@/composables/useDB";
import { useAiQuota } from "@/composables/useAiQuota";
import { useI18n } from "vue-i18n";

// const localePath = useLocalePath() // if run on client/setup
// const settingsUrl = localePath('/settings') // e.g. /fr/settings

// Global handler the UI registers (ChatLayoutOnboarding sets this)
let __onBotMessage = (payload) => {
  const text = typeof payload === "string" ? payload : payload?.text;
};
export function setOnboardingBotMessageHandler(fn) {
  if (typeof fn === "function") __onBotMessage = fn;
}

export function useOnboardingAi() {
  const { locale, t } = useI18n();
  const draft = useOnboardingDraftStore(); 
  const auth = useAuthStore();
  const chat = useChatStore();
  const db = useDb();
  // const { tryConsume } = useAiQuota();

  const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";

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
        if (draft.stage === "finalizing" || draft.stage === "done") {
          sawFinalize = true;
          continue;
        }
        // console.log("[onboarding][finalize] received action");
        const {
          public: { IMCHATTY_ID },
        } = useRuntimeConfig();
        if (typeof draft.setStage === "function") draft.setStage("finalizing");
        else draft.stage = "finalizing";
        try {
          // 1) Persist the profile
          await auth.finalizeOnboarding({
            displayname: draft.displayName,
            age: draft.age,
            gender_id: draft.genderId,
            bio: draft.bio,
            country_id: draft.countryId ?? null,
            state_id: draft.stateId ?? null,
            city_id: draft.cityId ?? null,
            ip: draft.ip ?? null,
          });
          // console.log("[onboarding][finalize] DB write done");

          // 2) Resolve the receiverId (the user's AUTH UID)
          // Prefer the profile’s user_id; fall back to the session/user id
          const receiverId =
            auth.userProfile?.user_id ??
            auth.session?.user?.id ??
            auth.user?.id ??
            null;

          // 3) Insert the welcome message as a real chat message from ImChatty
          const { insertMessage } = useDb();
          if (
            IMCHATTY_ID &&
            receiverId &&
            typeof insertMessage === "function"
          ) {
            const rawName =
              draft.displayName ??
              auth.userProfile?.displayname ??
              auth.session?.user?.user_metadata?.displayname ??
              "";

            const rawBio = draft.bio ?? "";

            const display =
              String(rawName)
                .trim()
                .replace(/\s+/g, " ") // collapse weird spacing
                .slice(0, 40) || // keep it reasonable
              "there"; // friendly fallback

            const settingsUrl = "/settings";
            const welcome =
              `${t("onboarding.welcomeHeadline", { name: display })} ` +
              `[[br]] ` +
              `${t("onboarding.welcomeBioIntro")} ` +
              `[[divider]] ` +
              `_${rawBio}_ ` +
              `[[divider]] ` +
              `${t("onboarding.welcomeSettings", { settingsUrl })}`;

            await insertMessage(receiverId, IMCHATTY_ID, welcome);
          }

          // 4) Mark onboarding complete in the draft store
          if (typeof draft.setStage === "function") draft.setStage("done");
          else draft.stage = "done";

          // (Optional) If your UI needs the bot thread selected for any follow-up UI:
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
        }

        // prevent any auto-resume logic after finalize
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

  async function sendUserMessage(userText) {
    ensureBotSelected();

    const { tryConsume, getDailyLimit, limitReachedMessage } = useAiQuota();

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

    const required = ["displayName", "age", "genderId", "bio"];
    const summary = {
      displayName: draft.displayName ?? null,
      age: draft.age ?? null,
      genderId: draft.genderId ?? null,
      bio: typeof draft.bio === "string" ? draft.bio : "",
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
      // resume: false  // <-- do NOT include resume on a send
    });

    await applyActions(actions);
  }


  

  return { resume, sendUserMessage };
}
