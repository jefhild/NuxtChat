// composables/articles/useArticlePresence.js
import { ref, onMounted, onUnmounted } from "vue";
import { useDb } from "@/composables/useDB";

export const useArticlePresence = (threadIdRef) => {
  const { getClient } = useDb();
  const supabase = process.client ? getClient() : null;

  const now = ref([]);
  const recent = ref([]);
  let channel = null;

  // simple in-memory cache
  const profileCache = ref({});

  const fetchProfiles = async (ids = []) => {
    if (!supabase || !ids.length) return;
    const missing = ids.filter((id) => !profileCache.value[id]);
    if (!missing.length) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, displayname, avatar_url")
      .in("user_id", missing);
    if (error) {
      console.warn("[presence] profiles fetch error", error);
      return;
    }
    for (const p of data || []) {
      profileCache.value[p.user_id] = {
        displayname: p.displayname || null,
        avatar_url: p.avatar_url || null,
      };
    }
  };

  const join = async () => {
    if (!process.client || !supabase || !threadIdRef?.value) return;

    const user = useSupabaseUser?.()?.value || {};
    const myId = user?.id || null;

    console.debug("[presence] join called", {
      threadId: threadIdRef.value,
      myId,
    });

    channel = supabase.channel(`presence:thread:${threadIdRef.value}`, {
      config: { presence: { key: `user:${myId || "anon"}` } },
    });

    channel.on("presence", { event: "sync" }, async () => {
      const state = channel.presenceState();
      const metas = [];
      Object.keys(state).forEach((k) => state[k].forEach((m) => metas.push(m)));

      const ids = [...new Set(metas.map((m) => m.userId).filter(Boolean))];
      await fetchProfiles(ids);

      now.value = metas.map((m) => {
        const prof = m.userId ? profileCache.value[m.userId] : null;
        return {
          ...m,
          displayname: prof?.displayname ?? m.displayname ?? "Anonymous",
          avatarUrl: prof?.avatar_url ?? m.avatarUrl ?? null,
        };
      });

      console.debug("[presence] sync metas:", now.value.slice(0, 3));
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        console.debug("[presence] SUBSCRIBED, fetching profile for", myId);
        let myDisplay = user?.user_metadata?.displayname || "User";
        let myAvatar = user?.user_metadata?.avatar_url || null;

        if (myId) {
          const {
            data: me,
            error,
            status,
          } = await supabase
            .from("profiles")
            .select("user_id, displayname, avatar_url")
            .eq("user_id", myId)
            .maybeSingle();

          console.debug("[presence] profile fetch result", {
            status,
            error,
            me,
          });

          if (me) {
            profileCache.value[myId] = {
              displayname: me.displayname || null,
              avatar_url: me.avatar_url || null,
            };
            myDisplay = me.displayname || myDisplay;
            myAvatar = me.avatar_url || myAvatar;
          }
        }

        channel.track({
          userId: myId,
          displayname: myDisplay,
          avatarUrl: myAvatar,
        });

        console.debug("[presence] track payload", {
          userId: myId,
          displayname: myDisplay,
        });
      }
    });
  };

  const leave = () => {
    if (supabase && channel) {
      try {
        supabase.removeChannel(channel);
      } catch {}
      console.debug("[presence] left channel");
      channel = null;
    }
  };

  onMounted(join);
  onUnmounted(leave);

  return { now, recent, join, leave };
};
