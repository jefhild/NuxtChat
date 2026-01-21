import { onBeforeUnmount, watch } from "vue";
import { useDb } from "@/composables/useDB";
import { useAuthStore } from "@/stores/authStore1";
import { useNotificationStore } from "@/stores/notificationStore";

export const useFavoriteNotifications = () => {
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
      console.warn("[rt][favorites] setAuth failed:", err?.message || err);
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

    unsubscribe = await db.subscribeToFavorites(userId, {
      onInsert: async (row) => {
        const actorId = row?.user_id;
        if (!actorId) return;
        const { data: profile } = await db.getUserProfileFromId(actorId);
        const name = profile?.displayname || "Someone";
        const slug = profile?.slug || null;
        const chatRoute = slug
          ? { path: "/chat", query: { slug } }
          : { path: "/chat", query: { userId: actorId } };
        notifications.addNotification(
          "favorited",
          `${name} just favorited you!`,
          actorId,
          {
            avatarUrl: profile?.avatar_url || null,
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
