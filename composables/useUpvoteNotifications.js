import { onBeforeUnmount, watch } from "vue";
import { useDb } from "@/composables/useDB";
import { useAuthStore } from "@/stores/authStore1";
import { useNotificationStore } from "@/stores/notificationStore";

export const useUpvoteNotifications = () => {
  if (!import.meta.client) return;

  const auth = useAuthStore();
  const notifications = useNotificationStore();
  const db = useDb();
  const supabase = db.getClient();

  let unsubscribe = null;
  let authSub = null;
  let lastToken = null;

  const setRealtimeAuth = (token) => {
    try {
      supabase.realtime?.setAuth?.(token || undefined);
    } catch (err) {
      console.warn("[rt][upvotes] setAuth failed:", err?.message || err);
    }
  };

  const syncRealtimeAuth = async () => {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || null;
    if (token !== lastToken) {
      lastToken = token;
      setRealtimeAuth(token);
    }
  };

  syncRealtimeAuth();

  const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
    const token = session?.access_token || null;
    if (token !== lastToken) {
      lastToken = token;
      setRealtimeAuth(token);
    }
  });
  authSub = data?.subscription;

  const wireForUser = async (userId) => {
    if (!userId) return;
    if (unsubscribe) {
      await unsubscribe().catch(() => {});
      unsubscribe = null;
    }

    // Look up this user's profiles.id (needed to filter votes table)
    const { data: profile } = await db.getUserProfileFromId(userId);
    const profileId = profile?.id;
    if (!profileId) return;

    unsubscribe = await db.subscribeToUpvotes(profileId, {
      onInsert: async (row) => {
        const voterId = row?.user_id;
        if (!voterId || voterId === userId) return; // ignore self-votes
        const { data: voterProfile } = await db.getUserProfileFromId(voterId);
        const name = voterProfile?.displayname || "Someone";
        const slug = voterProfile?.slug || null;
        const chatRoute = slug
          ? { path: "/chat", query: { slug } }
          : { path: "/chat", query: { userId: voterId } };
        notifications.addNotification(
          "upvoted",
          `${name} upvoted your profile!`,
          voterId,
          {
            avatarUrl: voterProfile?.avatar_url || null,
            displayname: name,
            chatRoute,
          }
        );
      },
    });
  };

  watch(
    () => auth.user?.id,
    async (id) => {
      if (!id) {
        if (unsubscribe) {
          await unsubscribe().catch(() => {});
          unsubscribe = null;
        }
        return;
      }
      await wireForUser(id);
    },
    { immediate: true }
  );

  onBeforeUnmount(() => {
    if (unsubscribe) unsubscribe().catch(() => {});
    authSub?.unsubscribe?.();
  });
};
