// stores/authStore1.js
import { defineStore } from "pinia";
import { useOnboardingDraftStore } from "~/stores/onboardingDraftStore";
import { useDb } from "@/composables/useDB";
import { usePresenceStore2 } from "@/stores/presenceStore2";
// import { useSupabaseClient } from "#imports"; // adjust if your import path differs

function resolveAuthStatus({ session, user, profile }) {
  if (!session || !user) return "unauthenticated";
  if (user.is_anonymous) {
    const complete = !!(
      profile?.displayname &&
      profile?.age &&
      profile?.gender_id
    );
    if (!profile) return "guest";
    return complete ? "anon_authenticated" : "onboarding";
  }
  return "authenticated";
}

/**
 * Returns one of the 5 well-defined auth states:
 * - 'unauthenticated': no user session
 * - 'guest': anonymous user with no profile
 * - 'onboarding': anonymous user, profile started but not complete
 * - 'anon_authenticated': anonymous user with completed onboarding
 * - 'authenticated': fully registered user
 */

const AI_LIMITS = {
  unauthenticated: 0,
  guest: 15, // enough for onboarding
  onboarding: 15,
  anon_authenticated: 50,
  authenticated: 200,
};

let _logoutInflight = null;

async function _clearSupabaseTokensSafe() {
  try {
    // Supabase stores token under keys like: sb-<project-ref>-auth-token
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith("sb-") && k.endsWith("-auth-token")) {
        localStorage.removeItem(k);
      }
    }
  } catch {}
}

export const useAuthStore = defineStore("authStore1", {
  state: () => ({
    authStatus: "unauthenticated",
    user: null,
    userProfile: null,
    onboardingLocal: false,
    // authBusy: false, // optional flag you can set
  }),

  getters: {
    getAiLimit(state) {
      return AI_LIMITS[state.authStatus] ?? 0;
    },

    // canUseOAuth(state) { return !state.authBusy; },
  },

  actions: {
    // setAuthBusy(val) {
    //   this.onboardingLocal = !!val;
    // },
    setOnboardingLocal(val) {
      this.onboardingLocal = !!val;
    },

    clear() {
      this.user = null;
      this.userProfile = null;
      this.authStatus = "unauthenticated";
    },

    setUserAndProfile(user, profile) {
      this.user = user;
      this.userProfile = Array.isArray(profile) ? profile[0] : profile;
    },

    async checkAuth() {
      const { getUserProfileFunctionFromId, getClient } = useDb();
      const supabase = getClient();

      const { data: sessionData, error: sessErr } =
        await supabase.auth.getSession();
      if (sessErr) {
        console.warn("[authStore1] getSession error:", sessErr);
        this.clear();
        this.onboardingLocal = false;
        if (import.meta.client) {
          try {
            const presence = usePresenceStore2();
            await presence.leave();
          } catch {}
          try {
            const draft = useOnboardingDraftStore();
            draft.clearAll?.();
          } catch {}
        }
        return;
      }

      const session = sessionData?.session || null;
      const user = session?.user || null;
      let profile = null;

      if (user) {
        try {
          const arr = await getUserProfileFunctionFromId(user.id);
          profile = Array.isArray(arr) ? arr[0] : arr ?? null;
        } catch (e) {
          console.warn("[authStore1] getUserProfile error:", e);
          profile = null;
        }
      }

      let status = resolveAuthStatus({ session, user, profile });
      // keep onboarding if we’re anon, no profile yet, but user already consented and started onboarding
      if (status === "guest" && user?.is_anonymous && this.onboardingLocal) {
        status = "onboarding";
      }

      this.$patch({ user, userProfile: profile, authStatus: status });
    },

    async ensureAnonymousUserAfterConsent() {
      const { getClient } = useDb();
      const supabase = getClient();

      // ── 0) SSR guard ─────────────────────────────────────────────────────────────
      if (!import.meta.client) {
        console.warn("[ensureAnon] called on server; skip");
        return null;
      }

      console.log("[ensureAnon] start");

      // ── 1) Existing session? ─────────────────────────────────────────────────────
      const sess0 = await supabase.auth.getSession();
      const sessUserId = sess0.data?.session?.user?.id || null;
      console.log("[ensureAnon] getSession(pre):", {
        hasSession: !!sess0.data?.session,
        sessUserId,
      });

      if (sessUserId) {
        const user = sess0.data.session.user;
        this.$patch({
          user,
          authStatus: user.is_anonymous
            ? this.onboardingLocal
              ? "onboarding"
              : "guest"
            : "authenticated",
        });
        console.log("[ensureAnon] reuse session user:", {
          id: user.id,
          is_anonymous: user.is_anonymous,
          authStatus: this.authStatus,
        });
        return this.user;
      }

      // ── 2) No session → sign in anonymously ──────────────────────────────────────
      console.log("[ensureAnon] signInAnonymously()…");
      const { data: anonData, error: anonErr } =
        await supabase.auth.signInAnonymously();
      if (anonErr) {
        console.error("[ensureAnon] signInAnonymously failed:", anonErr);
        throw anonErr;
      }
      console.log("[ensureAnon] signInAnonymously returned:", {
        immediateUserId: anonData?.user?.id || null,
      });

      // ── 3) Read back user (cookie may land a tick later) ─────────────────────────
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

      // single immediate check
      let ures = await supabase.auth.getUser();
      let userId = ures.data?.user?.id || null;
      console.log("[ensureAnon] getUser(immediate):", { userId });

      // short poll (only if needed)
      for (let i = 0; !userId && i < 10; i++) {
        await sleep(100);
        ures = await supabase.auth.getUser();
        userId = ures.data?.user?.id || null;
        if (userId)
          console.log("[ensureAnon] getUser(poll hit):", {
            userId,
            attempt: i + 1,
          });
      }

      if (!userId) {
        // extra: check session now
        const sess1 = await supabase.auth.getSession();
        console.warn("[ensureAnon] no user after anon; session now:", {
          hasSession: !!sess1.data?.session,
          sessUserId: sess1.data?.session?.user?.id || null,
        });
        throw new Error("[ensureAnon] No user after anonymous sign-in");
      }

      const user = ures.data.user;
      this.$patch({
        user,
        authStatus: this.onboardingLocal ? "onboarding" : "guest",
      });
      console.log("[ensureAnon] created anon user:", {
        id: user.id,
        is_anonymous: user.is_anonymous,
        authStatus: this.authStatus,
      });

      return this.user;
    },

    // called once onboarding is confirmed in chat
    async upsertProfileFromDraft(draft) {
      if (!this.user?.id) throw new Error("No user id to attach profile to.");
      const { upsertProfileWithJoins, getUserProfileFunctionFromId } = useDb();

      const payload = {
        user_id: this.user.id,
        displayname: draft.displayname,
        age: draft.age,
        gender_id: draft.gender_id,
        status_id: draft.status_id ?? null,
        avatar_url: draft.avatar_url ?? null,
        country_id: draft.country_id ?? null,
        state_id: draft.state_id ?? null,
        city_id: draft.city_id ?? null,
        bio: draft.bio ?? null,
        interests: Array.isArray(draft.interests) ? draft.interests : [],
        descriptions: Array.isArray(draft.descriptions)
          ? draft.descriptions
          : [],
        slug: draft.slug ?? null,
        provider: "anonymous",
      };

      const { error } = await upsertProfileWithJoins(payload);
      if (error) throw error;

      const profileArr = await getUserProfileFunctionFromId(this.user.id);
      this.userProfile = Array.isArray(profileArr)
        ? profileArr[0]
        : profileArr ?? null;

      return this.userProfile;
    },

    async finalizeOnboarding(draft) {
      // const supabase = useSupabaseClient();

      const {
        getClient,
        insertProfileFromObject,
        getUserProfileFunctionFromId,
      } = useDb();

      const supabase = getClient();

      await this.ensureAnonymousUserAfterConsent();
      const userId = this.user?.id;
      if (!userId) throw new Error("No Supabase user found for finalize");

      // helpers
      const toNum = (v) => (typeof v === "number" ? v : Number.parseInt(v, 10));
      const pickId = (camel, snake) => {
        const v = camel ?? snake ?? null;
        return Number.isFinite(toNum(v)) ? toNum(v) : null;
      };

      const payload = {
        user_id: userId,
        displayname: draft.displayName ?? draft.displayname ?? null,
        age: Number.isFinite(toNum(draft.age)) ? toNum(draft.age) : null,
        gender_id: pickId(draft.genderId, draft.gender_id),
        bio: draft.bio ?? null,
        country_id: pickId(draft.countryId, draft.country_id),
        state_id: pickId(draft.stateId, draft.state_id),
        city_id: pickId(draft.cityId, draft.city_id),
        ip: draft.ip ?? null,

        provider: "anonymous",
      };

      console.log("[finalize] payload", payload);

      const { error } = await insertProfileFromObject(payload);
      if (error) {
        const msg = String(error.message || "");
        const isDuplicate =
          error.code === "23505" || msg.includes("duplicate key");
        if (!isDuplicate) throw error;
      }

      const arr = await getUserProfileFunctionFromId(userId);
      const profile = Array.isArray(arr) ? arr[0] : arr ?? null;
      this.userProfile = profile;

      const {
        data: { session },
      } = await supabase.auth.getSession();
      this.authStatus = resolveAuthStatus({
        session,
        user: this.user,
        profile,
      });
      this.onboardingLocal = false;
      return this.userProfile;
    },

    async logout() {
      if (_logoutInflight) return _logoutInflight;

      _logoutInflight = (async () => {
        try {
          const { getClient, authSignOut } = useDb(); // keep your wrapper
          const supabase = getClient();

          const presence = usePresenceStore2();
          const messages = useMessagesStore();
          const typing = useTypingStore();

          // 1) Stop realtime
          await Promise.allSettled([presence.leave(), messages.dispose?.()]);
          typing.reset?.();

          // 2) Sign out (global clears other tabs too)
          try {
            await supabase.auth.signOut({ scope: "global" });
          } catch {
            // Fallback to your wrapper if needed
            try {
              await authSignOut();
            } catch {}
          }

          // 3) Belt & suspenders: remove any lingering auth token
          await _clearSupabaseTokensSafe();

          // 4) Reset onboarding/drafts
          try {
            const draft = useOnboardingDraftStore();
            draft.clearAll?.();
            this.onboardingLocal = false;
          } catch {}

          // 5) Reset auth store
          this.clear();

          console.log("[authStore1] logout complete");
        } catch (err) {
          console.error("[authStore1] logout error:", err);
          throw err;
        } finally {
          _logoutInflight = null;
        }
      })();

      return _logoutInflight;
    },
  },
});
