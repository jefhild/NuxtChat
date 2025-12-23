import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/authStore1";

import { useOnboardingDraftStore } from "@/stores/onboardingDraftStore";



const IMCHATTY_ID = "a3962087-516b-48df-a3ff-3b070406d832";
const REQUIRED = ["displayname", "age", "gender_id"];

// ---------- helpers ----------
function missingFields(d) {
  return REQUIRED.filter((k) => !d?.[k]);
}

function ackFor(field, value) {
  if (field === "displayname") return `${value}, noted.`;
  if (field === "age") return `${value}, got it.`;
  if (field === "gender_id") {
    const g =
      {
        1: t("onboarding.gender.male", "Male"),
        2: t("onboarding.gender.female", "Female"),
        3: t("onboarding.gender.other", "Other"),
      }[value] || "—";
    return `${g}, thanks.`;
  }
  return "";
}

function genderQuickReplies(t) {
  return [
    t("onboarding.gender.male", "Male"),
    t("onboarding.gender.female", "Female"),
    t("onboarding.gender.other", "Other"),
  ];
}

function hasAnyDraft(d) {
  return !!(d.displayname || d.age || d.gender_id || d.bio);
}

function recapText(d, t) {
  const genderLabel =
    {
      1: t("onboarding.gender.male", "Male"),
      2: t("onboarding.gender.female", "Female"),
      3: t("onboarding.gender.other", "Other"),
    }[d.gender_id] || "—";
  const parts = [
    t("onboarding.summary", "Let’s recap:"),
    `• ${t("onboarding.name", "Name")}: ${d.displayname ?? "—"}`,
    `• ${t("onboarding.age", "Age")}: ${d.age ?? "—"}`,
    `• ${t("onboarding.genderLabel", "Gender")}: ${genderLabel}`,
  ];
  return parts.join(" ");
}

// clean a plausible handle from text (3–24 chars, contains a letter)
function cleanName(s, deny = []) {
  const raw = String(s || "").trim();
  const m = raw.match(/([A-Za-z0-9._-]{3,24})/);
  const x = (m ? m[1] : raw).trim();

  if (x.length < 3 || x.length > 24) return null;
  if (!/[A-Za-z\u00C0-\u024F\u0400-\u04FF\u4E00-\u9FFF]/.test(x)) return null;

  const denySet = new Set(deny.map((d) => String(d).toLowerCase()));
  if (denySet.has(x.toLowerCase())) return null;

  return x;
}

function extractAge(text) {
  const m = String(text || "").match(/\b([1-9]\d?)\b/);
  if (!m) return null;
  const age = parseInt(m[1], 10);
  return age >= 18 && age <= 100 ? age : null;
}

// tolerant gender extractor (handles typos like "femal", single-letter replies, etc.)
function extractGenderId(text) {
  const k = String(text || "")
    .trim()
    .toLowerCase();

  // common typos & quick shorthands
  if (/^f(em(al|ail|ale|ael)?|)$/i.test(k)) return 2; // f, femal, femail, female
  if (/^m(al(e)?)?$/i.test(k)) return 1; // m, mal, male

  if (/\b(male|man|boy|gars?)\b/i.test(k)) return 1;
  if (/\b(female|woman|girl|femme)\b/i.test(k)) return 2;

  // other / non-binary
  if (/\b(non[-\s]?binary|nb|other|autre|其他)\b/i.test(k)) return 3;

  return null;
}

function parseKeywords(input) {
  if (!input) return [];
  const cleaned = String(input)
    .replace(/^\s*(how about|maybe|let'?s (try|do|use))\s+/i, "")
    .replace(/[.“”"']/g, "");
  return cleaned
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
}

export function useOnboardingAgent(selectedUserRef) {
  const { t, locale } = useI18n();
  const auth = useAuthStore();
  const draftStore = useOnboardingDraft();

  const say = (text, extra = {}) => ({ type: "bot", text, ...extra });

  const talkingToImchatty = computed(() => {
    const u = selectedUserRef?.value;
    return (
      !!u && (u.user_id === IMCHATTY_ID || u.id === IMCHATTY_ID || u.is_ai)
    );
  });

  const needsOnboarding = computed(() => {
    if (!talkingToImchatty.value) return false;
    return ["unauthenticated", "guest", "onboarding"].includes(auth.authStatus);
  });

  function summarize(d) {
    const genderLabel =
      {
        1: t("onboarding.gender.male", "Male"),
        2: t("onboarding.gender.female", "Female"),
        3: t("onboarding.gender.other", "Other"),
      }[d.gender_id] || "—";
    return [
      t("onboarding.summary", "Let’s recap:"),
      `• ${t("onboarding.name", "Name")}: ${d.displayname}`,
      `• ${t("onboarding.age", "Age")}: ${d.age}`,
      `• ${t("onboarding.genderLabel", "Gender")}: ${genderLabel}`,
      t(
        "onboarding.confirm",
        'Reply "confirm" to save, or "edit" to change something.'
      ),
    ].join(" ");
  }

  // ---------------- main handler ----------------
  async function handleUserMessage(raw) {
    if (!needsOnboarding.value) return null;

    const text = String(raw ?? "").trim();
    const low = text.toLowerCase();

    // ====== CONSENT FIRST (chips only here) ======
    if (auth.authStatus === "unauthenticated") {
      const yesLbl = t("onboarding.yes", "Yes");
      const noLbl = t("onboarding.no", "No");

      const saidYes = [yesLbl, "yes", "oui", "да", "是"].some((w) =>
        low.includes(w.toLowerCase())
      );
      const saidNo = [noLbl, "no", "non", "нет", "否"].some((w) =>
        low.includes(w.toLowerCase())
      );

      if (saidYes) {
        try {
          await auth.ensureAnonymousUserAfterConsent();
        } catch {
          return say(
            t(
              "onboarding.sessionError",
              "I couldn't start your session. Please try again."
            )
          );
        }
      } else if (saidNo) {
        try {
          await auth.logout();
        } catch {}
        return {
          type: "bot",
          text: t(
            "onboarding.consentDeclined",
            "No problem. Whenever you’re ready, you can start onboarding, or log in if you already have an account."
          ),
          quickReplies: [
            t("onboarding.loginCta", "Log in"),
            t("onboarding.startCta", "Start onboarding"),
          ],
        };
      } else {
        return {
          type: "bot",
          text: t(
            "onboarding.welcome",
            "👋 Welcome to ImChatty. Ready to create a profile?"
          ),
          quickReplies: [yesLbl, noLbl],
        };
      }
    }

    // ====== RESUME GATE when we already have a draft on refresh ======
    const d0 = draftStore.draft;

    // Handle user intent first

    if (/^(start over|reset|recommencer|reset profile)$/i.test(low)) {
      draftStore.reset();
      draftStore.setLastAsked?.("displayname");
      return {
        type: "bot",
        text: t("onboarding.askName", "What display name do you want?"),
        quickReplies: [],
      };
    }
    if (/^(continue|resume|continuer)$/i.test(low)) {
      // fall through to normal flow
    }

    if (hasAnyDraft(d0) && !draftStore._resumeAcknowledged) {
      // Show recap + choice chips once per session
      draftStore._resumeAcknowledged = true;
      return {
        type: "bot",
        text:
          t(
            "onboarding.resumeDraftIntro",
            "You already started a profile. Here’s what I have:"
          ) +
          " " +
          recapText(d0, t),
        quickReplies: [
          t("onboarding.startOver", "Start over"),
          t("onboarding.continue", "Continue"),
        ],
      };
    }

    // ====== PENDING CONFIRMATIONS (e.g., gender) ======
    const pending = draftStore.draft.pendingConfirm;
    if (pending) {
      const saysYes = /\b(yes|yep|sure|ok|okay|oui|да|是)\b/i.test(low);
      const saysNo = /\b(no|nope|non|нет|否)\b/i.test(low);

      if (saysYes) {
        const dnow = { ...draftStore.draft };
        dnow[pending.field] = pending.value;
        draftStore.patch(dnow);
        draftStore.clearPendingConfirm?.();
        // proceed with flow after setting the field
      } else if (saysNo) {
        draftStore.clearPendingConfirm?.();
        if (pending.field === "gender_id") {
          return {
            type: "bot",
            text: t("onboarding.askGender", "What is your gender?"),
            quickReplies: genderQuickReplies(t),
          };
        }
        // fall through for other fields (future)
      } else {
        if (pending.field === "gender_id") {
          const glabel =
            {
              1: t("onboarding.gender.male", "Male"),
              2: t("onboarding.gender.female", "Female"),
              3: t("onboarding.gender.other", "Other"),
            }[pending.value] || "—";
          return {
            type: "bot",
            text: t(
              "onboarding.confirmGender",
              `Just to confirm, is your gender ${glabel}?`
            ),
            quickReplies: genderQuickReplies(t),
          };
        }
      }
    }

    // ====== LOCAL OPPORTUNISTIC EXTRACTION ======
    const d = { ...draftStore.draft };
    const capturedThisTurn = []; // track what we just parsed

    if (!d.displayname) {
      const name = cleanName(text);
      if (name) {
        d.displayname = name;
        capturedThisTurn.push(["displayname", name]);
      }
    }
    if (!d.age) {
      const age = extractAge(text);
      if (age) {
        d.age = age;
        capturedThisTurn.push(["age", age]);
      }
    }
    if (!d.gender_id) {
      const gidLocal = extractGenderId(text);
      if (gidLocal) {
        d.gender_id = gidLocal;
        capturedThisTurn.push(["gender_id", gidLocal]);
      }
    }

    draftStore.patch(d);
    if (capturedThisTurn.length) {
      const [field, value] = capturedThisTurn[capturedThisTurn.length - 1];
      draftStore.setLastCaptured(field, value);
    }

    // ====== AUTO BIO KEYWORDS (no chip): when name+age present but bio missing ======
    let missing = missingFields(d);

    const hasNameAndAge = !!d.displayname && !!d.age;
    const needsBio = !draftStore.draft.bio;

    // 1) capture keywords if we are waiting for them
    if (draftStore.draft.bioStage === "ask_keywords") {
      const kws = parseKeywords(text);
      if (!kws.length) {
        return {
          type: "bot",
          text: t(
            "onboarding.askBioKeywords",
            "Give me 3–6 keywords for your bio (comma‑separated)."
          ),
          quickReplies: [],
        };
      }

      draftStore.setBioStage("generating");
      draftStore.setBioKeywords(kws);

      try {
        const genderLabel =
          {
            1: t("onboarding.gender.male", "Male"),
            2: t("onboarding.gender.female", "Female"),
            3: t("onboarding.gender.other", "Other"),
          }[draftStore.draft.gender_id] || "";

        const bioRes = await $fetch("/api/aiGenerateBio", {
          method: "POST",
          body: {
            displayname: d.displayname,
            age: d.age,
            gender: genderLabel,
            keywords: kws,
            locale: locale.value || "en",
          },
        });

        // Support both response shapes
        const bioText = bioRes?.bio ?? bioRes?.aiResponse ?? null;

        // ✅ never leave it null → avoid re-asking loop
        draftStore.setBio(
          bioText ||
            t(
              "onboarding.bioFallback",
              "Coffee-fueled optimist seeking co‑pilot for small adventures."
            )
        );
        draftStore.setBioStage("idle");
        draftStore.setLastAsked?.(null); // if you use lastAskedField

        // Don’t return here; let the flow continue below
      } catch (e) {
        draftStore.setBioStage("idle");
        return {
          type: "bot",
          text: t(
            "onboarding.bioError",
            "Couldn't generate a bio right now. Want to try again with different keywords?"
          ),
          quickReplies: [],
        };
      }
    }

    // 2) if we have name+age but no bio yet, ask for keywords (once)
    if (hasNameAndAge && needsBio && draftStore.draft.bioStage === "idle") {
      draftStore.setBioStage("ask_keywords");
      return {
        type: "bot",
        text: t(
          "onboarding.askBioKeywords",
          "Give me 3–6 keywords for your bio (comma‑separated)."
        ),
        quickReplies: [],
      };
    }

    // Recompute (bio isn't required; REQUIRED is displayname/age/gender_id)
    missing = missingFields(d);

    // ====== STILL MISSING → ask LLM for next question (chips only for gender) ======
    if (missing.length) {
      let res;
      try {
        res = await $fetch("/api/aiOnboardingTurn", {
          method: "POST",
          body: {
            draft: draftStore.draft,
            lastUserMessage: text,
            locale: locale.value || "en",
            history: [],
            required: REQUIRED,
          },
        });
      } catch (e) {
        console.warn("[aiOnboardingTurn] fallback due to error:", e);
        const next = missing[0];
        const lc = draftStore.draft.lastCaptured;
        let utter =
          res?.utterance ||
          t("onboarding.moreInfo", "Please share a bit more info.");
        if (lc) {
          utter = `${ackFor(lc.field, lc.value)} ${utter}`.trim();
          draftStore.clearLastCaptured();
        }
        const ack = lc ? ackFor(lc.field, lc.value) : "";
        if (next === "displayname") {
          draftStore.setLastAsked("displayname");
          draftStore.clearLastCaptured();
          return say(
            `${ack} ${t(
              "onboarding.askName",
              "What display name do you want?"
            )}`.trim()
          );
        }
        if (next === "age") {
          draftStore.setLastAsked("age");
          draftStore.clearLastCaptured();
          return say(
            `${ack} ${t(
              "onboarding.askAge",
              "How old are you? (18–100)"
            )}`.trim()
          );
        }
        if (next === "gender_id") {
          draftStore.setLastAsked("gender_id");
          draftStore.clearLastCaptured();
          return {
            type: "bot",
            text: `${ack} ${t("onboarding.askGender", "What is your gender?")}`.trim(),
            quickReplies: genderQuickReplies(t),
          };
        }
        return say(t("onboarding.moreInfo", "Please share a bit more info."));
      }

      // Merge extracted with guard (never hallucinate gender)
      const ex = res?.extracted || {};
      if (ex.displayname) {
        const n = cleanName(ex.displayname);
        if (n) d.displayname = n;
      }
      if (ex.age != null) {
        const ok = extractAge(String(ex.age));
        if (ok) d.age = ok;
      }
      // only set gender here if user text explicitly mentioned gender;
      // otherwise, use pendingConfirm flow
      const userMentionsGender =
        /\b(gender|sexe|genre|male|female|homme|femme|man|woman|nonbinary|autre|其他|性别)\b/i.test(
          text
        );
      if (ex.gender_id && userMentionsGender && !d.gender_id) {
        const gid = Number(ex.gender_id);
        if ([1, 2, 3].includes(gid)) d.gender_id = gid;
      }

      draftStore.patch(d);

      // If the AI asked to confirm a certain gender, remember that proposal
      const uAsk = String(res?.utterance || "").toLowerCase();
      const suggestFemale = /\b(female|femme)\b/.test(uAsk);
      const suggestMale = /\b(male|homme)\b/.test(uAsk);
      const suggestOther = /\b(nonbinary|other|autre)\b/.test(uAsk);
      const asksConfirm =
        /\b(confirm|just to confirm|confirmer|подтвердить|确认)\b/.test(uAsk);
      if (
        !d.gender_id &&
        asksConfirm &&
        (suggestFemale || suggestMale || suggestOther)
      ) {
        const value = suggestFemale ? 2 : suggestMale ? 1 : 3;
        draftStore.setPendingConfirm?.("gender_id", value);
      }

      // recompute after merging
      missing = missingFields(d);

      if (missing.length) {
        const showGenderReplies =
          missing.length === 1 && missing[0] === "gender_id";
        return {
          type: "bot",
          text:
            res?.utterance ||
            t("onboarding.moreInfo", "Please share a bit more info."),
          quickReplies: showGenderReplies ? genderQuickReplies(t) : [],
        };
      }
    }

    // ====== COMPLETE → recap + Finish (single chip) or react to "confirm" ======
    if (/(finish profile|finish|confirm|save|valider|oui)\b/i.test(low)) {
      try {
        await auth.finalizeOnboarding(draftStore.draft);
        draftStore.setStep?.("done");
        return {
          type: "bot",
          text: t("onboarding.done", "All set ✨ Your profile is ready!"),
        };
      } catch (e) {
        console.error("[onboarding] finalize error", e);
        return {
          type: "bot",
          text: t(
            "onboarding.saveError",
            "Oops, I had trouble saving. Please try again."
          ),
        };
      }
    }

    return {
      type: "bot",
      text: summarize(draftStore.draft),
      quickReplies: [t("onboarding.finishCta", "Finish profile")],
    };
  }

  return { needsOnboarding, handleUserMessage };
}
