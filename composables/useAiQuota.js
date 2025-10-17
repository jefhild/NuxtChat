// composables/useAiQuota.js
import { storeToRefs } from "pinia";
import { useAuthStore } from "~/stores/authStore1";
import { useDb } from "@/composables/useDB";

const LIMITS = {
  unauthenticated: 0,
  guest: 2,
  onboarding: 6,
  anon_authenticated: 20,
  authenticated: 200,
};

export function limitReachedMessage(authStatus, limit) {
  switch (authStatus) {
    case "guest":
      return `You’ve reached today’s guest AI limit (${limit}). If there's a problem, sign in here.`;
    case "onboarding":
      return `You’ve reached today’s onboarding AI  limit. If you're having a problem, sign in here.[Signin page](/signin)`;
    case "anon_authenticated":
      return `You’ve reached today’s AI limit (${limit}). Verify your email to unlock higher limits and save your chats.`;
    case "authenticated":
      return `You’ve reached your daily AI limit (${limit}). It will reset at midnight (Europe/Paris).`;
    default:
      return `You’ve reached today’s AI limit. Create an account to get more chats and continue.`;
  }
}

export function useAiQuota() {
  // ✅ get the client *inside* the composable factory
  const { getClient } = useDb();
  const supabase = getClient();

  const auth = useAuthStore();
  const { user, authStatus } = storeToRefs(auth);

  const getDailyLimit = () =>
    LIMITS[authStatus.value || "unauthenticated"] ?? 0;
  const getUserId = () => user.value?.id || user.value?.user_id || null;

  const tryConsume = async () => {
    const limit = getDailyLimit();
    const uid = getUserId();

    if (!uid) {
      const res = { allowed: false, used: 0, remaining: 0, limit };
      console.info("[AI QUOTA] no session →", res);
      return res;
    }

    const { data, error } = await supabase.rpc("ai_try_consume_any", {
      p_user: uid,
      p_limit: limit,
      p_tz: "Europe/Paris",
    });

    if (error) {
      console.error("[AI QUOTA] rpc error", error);
      return { allowed: false, used: 0, remaining: 0, limit };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.warn("[AI QUOTA] unexpected RPC shape:", data);
      return { allowed: false, used: 0, remaining: 0, limit };
    }

    const res = { ...row, limit };
    console.info("[AI QUOTA] →", res);
    return res;
  };

  return { tryConsume, getDailyLimit, limitReachedMessage };
}
