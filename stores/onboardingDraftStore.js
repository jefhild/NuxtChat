// stores/onboardingDraftStore.js
import { defineStore } from "pinia";

export const useOnboardingDraftStore = defineStore("onboardingDraft", {
  state: () => ({
    displayName: "",
    age: null,
    genderId: null, // 1=male, 2=female, 3=other (adjust to your mapping)
    bio: "",
    tagline: "",
    consented: false,
    countryId: null,
    stateId: null,
    cityId: null,
    ip: null,
    stage: "idle", // 'idle' | 'consent' | 'collecting' | 'confirm' | 'finalizing' | 'done'
    updatedAt: null,
    thread: [], // ephemeral onboarding conversation
    // Mood Feed onboarding (auth-only)
    moodFeedStage: "idle", // 'idle' | 'prompt' | 'confirm' | 'done'
    moodFeedPrompt: "",
    moodFeedPromptKey: "",
    moodFeedAnswer: "",
    moodFeedRefined: "",
    moodFeedAttempts: 0,
    moodFeedStatus: "", // 'published' | 'pending_validation'
    moodFeedDeferUntil: 0,
    liveMoodStage: "idle", // 'idle' | 'prompt' | 'confirm' | 'clarify' | 'done'
    liveMoodPersonaKey: "",
    liveMoodPersonaUserId: "",
    liveMoodPersonaDisplayName: "",
    liveMoodPersonaAvatarUrl: "",
    liveMoodPrompt: "",
    liveMoodInput: "",
    liveMoodCandidate: null,
    liveMoodClarifierOptions: [],
    liveMoodRefinementCount: 0,
    liveMoodNudges: null,
    liveMoodNextStepStage: "idle", // 'idle' | 'choose' | 'dormant' | 'done'
    handoffPending: false,
  }),

  getters: {
    missingFields(state) {
      const fields = [];
      if (!state.displayName) fields.push("displayName");
      if (state.age == null) fields.push("age");
      if (state.genderId == null) fields.push("genderId");
      if (!state.bio) fields.push("bio");
      return fields;
    },
    isComplete(state) {
      return (
        !!state.consented &&
        !!state.displayName &&
        state.age != null &&
        state.genderId != null &&
        !!state.bio
      );
    },
    summary(state) {
      return {
        displayName: state.displayName || null,
        age: state.age ?? null,
        genderId: state.genderId ?? null,
        bio: state.bio || null,
        tagline: state.tagline || null,
        countryId: state.countryId ?? null,
        stateId: state.stateId ?? null,
        cityId: state.cityId ?? null,
      };
    },
  },

  actions: {
    setField(key, val) {
      // Only these are numeric; ip is NOT
      const numericKeys = new Set([
        "age",
        "genderId",
        "countryId",
        "stateId",
        "cityId",
      ]);

      // If a numeric key comes as a string, only coerce if it's purely digits
      if (typeof val === "string" && numericKeys.has(key) && /^\d+$/.test(val)) {
        const n = Number(val);
        if (Number.isFinite(n)) val = n;
      }

      const allowed = new Set([
        "displayName",
        "age",
        "genderId",
        "bio",
        "tagline",
        "countryId",
        "stateId",
        "cityId",
        "ip", // keep ip as string (IPv4 or IPv6)
        "consented",
        "stage",
        "thread",
        "moodFeedStage",
        "moodFeedPrompt",
        "moodFeedPromptKey",
        "moodFeedAnswer",
        "moodFeedRefined",
        "moodFeedAttempts",
        "moodFeedStatus",
        "moodFeedDeferUntil",
        "liveMoodStage",
        "liveMoodPersonaKey",
        "liveMoodPersonaUserId",
        "liveMoodPersonaDisplayName",
        "liveMoodPersonaAvatarUrl",
        "liveMoodPrompt",
        "liveMoodInput",
        "liveMoodCandidate",
        "liveMoodClarifierOptions",
        "liveMoodRefinementCount",
        "liveMoodNudges",
        "liveMoodNextStepStage",
        "handoffPending",
      ]);

      if (!allowed.has(key)) return;

      this[key] = val;
      this.updatedAt = new Date().toISOString();
      this.saveLocal();
    },

    setConsent(val) {
      this.consented = !!val;
      this.updatedAt = new Date().toISOString();
      this.saveLocal();
    },

    setStage(s) {
      this.stage = s;
      this.saveLocal();
    },

    clearAll() {
      this.displayName = "";
      this.age = null;
      this.genderId = null;
      this.bio = "";
      this.tagline = "";
      this.consented = false;
      this.countryId = null;
      this.stateId = null;
      this.cityId = null;
      this.ip = null;
      this.thread = [];
      this.moodFeedStage = "idle";
      this.moodFeedPrompt = "";
      this.moodFeedPromptKey = "";
      this.moodFeedAnswer = "";
      this.moodFeedRefined = "";
      this.moodFeedAttempts = 0;
      this.moodFeedStatus = "";
      this.moodFeedDeferUntil = 0;
      this.liveMoodStage = "idle";
      this.liveMoodPersonaKey = "";
      this.liveMoodPersonaUserId = "";
      this.liveMoodPersonaDisplayName = "";
      this.liveMoodPersonaAvatarUrl = "";
      this.liveMoodPrompt = "";
      this.liveMoodInput = "";
      this.liveMoodCandidate = null;
      this.liveMoodClarifierOptions = [];
      this.liveMoodRefinementCount = 0;
      this.liveMoodNudges = null;
      this.liveMoodNextStepStage = "idle";
      this.handoffPending = false;
      this.stage = "idle";
      this.updatedAt = null;
      try {
        localStorage.removeItem("onboardingDraft");
      } catch {}
    },

    loadLocal() {
      try {
        const raw = localStorage.getItem("onboardingDraft");
        if (!raw) return;
        const data = JSON.parse(raw);
        // only assign known keys
        for (const k of [
          "displayName",
          "age",
          "genderId",
          "bio",
          "tagline",
          "consented",
          "countryId",
          "stateId",
          "cityId",
          "stage",
          "updatedAt",
          "thread",
          "moodFeedStage",
          "moodFeedPrompt",
          "moodFeedPromptKey",
          "moodFeedAnswer",
          "moodFeedRefined",
          "moodFeedAttempts",
          "moodFeedStatus",
          "moodFeedDeferUntil",
          "liveMoodStage",
          "liveMoodPersonaKey",
          "liveMoodPersonaUserId",
          "liveMoodPersonaDisplayName",
          "liveMoodPersonaAvatarUrl",
          "liveMoodPrompt",
          "liveMoodInput",
          "liveMoodCandidate",
          "liveMoodClarifierOptions",
          "liveMoodRefinementCount",
          "liveMoodNudges",
          "liveMoodNextStepStage",
          "handoffPending",
        ]) {
          if (k in data) this[k] = data[k];
        }
      } catch {
        /* ignore */
      }
    },

    hydrate() {
      this.loadLocal();
    },

    saveLocal() {
      try {
        const {
          displayName,
          age,
          genderId,
          bio,
          tagline,
          consented,
          countryId,
          stateId,
          cityId,
          ip,
          stage,
          updatedAt,
          thread,
          moodFeedStage,
          moodFeedPrompt,
          moodFeedPromptKey,
          moodFeedAnswer,
          moodFeedRefined,
          moodFeedAttempts,
          moodFeedStatus,
          moodFeedDeferUntil,
          liveMoodStage,
          liveMoodPersonaKey,
          liveMoodPersonaUserId,
          liveMoodPersonaDisplayName,
          liveMoodPersonaAvatarUrl,
          liveMoodPrompt,
          liveMoodInput,
          liveMoodCandidate,
          liveMoodClarifierOptions,
          liveMoodRefinementCount,
          liveMoodNudges,
          liveMoodNextStepStage,
          handoffPending,
        } = this;
        localStorage.setItem("onboardingDraft", JSON.stringify({
          displayName,
          age,
          genderId,
          bio,
          tagline,
          consented,
          countryId,
          stateId,
          cityId,
          ip,
          stage,
          updatedAt,
          thread,
          moodFeedStage,
          moodFeedPrompt,
          moodFeedPromptKey,
          moodFeedAnswer,
          moodFeedRefined,
          moodFeedAttempts,
          moodFeedStatus,
          moodFeedDeferUntil,
          liveMoodStage,
          liveMoodPersonaKey,
          liveMoodPersonaUserId,
          liveMoodPersonaDisplayName,
          liveMoodPersonaAvatarUrl,
          liveMoodPrompt,
          liveMoodInput,
          liveMoodCandidate,
          liveMoodClarifierOptions,
          liveMoodRefinementCount,
          liveMoodNudges,
          liveMoodNextStepStage,
          handoffPending,
        }));
      } catch {
        /* ignore */
      }
    },

  appendThreadMessage(msg) {
    if (!msg || typeof msg !== "object") return;
    const payload = {
      id: msg.id || crypto.randomUUID?.() || String(Date.now()),
      from: msg.from || "imchatty",
      text: msg.text || "",
      quickReplies: Array.isArray(msg.quickReplies) ? msg.quickReplies : [],
      ts: msg.ts || Date.now(),
    };
    this.thread = [...this.thread, payload];
    this.saveLocal();
  },

  clearThread() {
    this.thread = [];
    this.saveLocal();
  },
  },
});

// ✅ Legacy alias so old imports keep working:
// import { useOnboardingDraft } from '~/stores/onboardingDraftStore'
export { useOnboardingDraftStore as useOnboardingDraft };
