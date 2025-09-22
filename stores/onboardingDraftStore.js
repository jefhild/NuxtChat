// stores/onboardingDraftStore.js
import { defineStore } from "pinia";

export const useOnboardingDraftStore = defineStore("onboardingDraft", {
  state: () => ({
    displayName: "",
    age: null,
    genderId: null, // 1=male, 2=female, 3=other (adjust to your mapping)
    bio: "",
    consented: false,
    countryId: null,
    stateId: null,
    cityId: null,
    ip: null,
    stage: "idle", // 'idle' | 'consent' | 'collecting' | 'confirm' | 'done'
    updatedAt: null,
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
        countryId: state.countryId ?? null,
        stateId: state.stateId ?? null,
        cityId: state.cityId ?? null,
      };
    },
  },

  actions: {
setField(key, val) {
  // Only these are numeric; ip is NOT
  const numericKeys = new Set(["age", "genderId", "countryId", "stateId", "cityId"]);

  // If a numeric key comes as a string, only coerce if it's purely digits
  if (typeof val === "string" && numericKeys.has(key) && /^\d+$/.test(val)) {
    const n = Number(val);
    if (Number.isFinite(n)) val = n;
  }

  console.log("keyval", { key, val });

  const allowed = new Set([
    "displayName",
    "age",
    "genderId",
    "bio",
    "countryId",
    "stateId",
    "cityId",
    "ip",        // keep ip as string (IPv4 or IPv6)
    "consented",
    "stage",
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
      this.consented = false;
      this.countryId = null;
      this.stateId = null;
      this.cityId = null;
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
          "consented",
          "countryId",
          "stateId",
          "cityId",
          "stage",
          "updatedAt",
        ]) {
          if (k in data) this[k] = data[k];
        }
      } catch {
        /* ignore */
      }
    },

    saveLocal() {
      try {
        const {
          displayName,
          age,
          genderId,
          bio,
          consented,
          countryId,
          stateId,
          cityId,
          ip,
          stage,
          updatedAt,
        } = this;
        localStorage.setItem(
          "onboardingDraft",
          JSON.stringify({
            displayName,
            age,
            genderId,
            bio,
            consented,
            countryId,
            stateId,
            cityId,
            ip,
            stage,
            updatedAt,
          })
        );
      } catch {
        /* ignore */
      }
    },
  },
});

// ✅ Legacy alias so old imports keep working:
// import { useOnboardingDraft } from '~/stores/onboardingDraftStore'
export { useOnboardingDraftStore as useOnboardingDraft };
