// composables/articles/useArticlePresence.js
import { ref, onMounted, onUnmounted } from "vue";
import { useDb } from "@/composables/useDB";

export const useArticlePresence = (threadIdRef) => {
  const { getClient } = useDb();
  const supabase = import.meta.client ? getClient() : null;

  // put near the top, after you create `supabase`
  // const ts = () => new Date().toISOString().slice(11, 23);
  // const log = (...a) => console.log(`[rt ${ts()}]`, ...a);
  // const warn = (...a) => console.warn(`[rt ${ts()}]`, ...a);
  // const err = (...a) => console.error(`[rt ${ts()}]`, ...a);

  // auth lifecycle (client only)
  let lastToken = null;
  async function maybeSetAuthOnce() {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token || null;
    if (token !== lastToken) {
      // log("setAuth token change", { prev: !!lastToken, next: !!token });
      lastToken = token;
      try {
        supabase.realtime.setAuth(token || undefined);
      } catch (e) {
        err("setAuth", e);
      }
    } else {
      // log("setAuth skipped (unchanged)");
    }
  }
  if (import.meta.client) {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const t = session?.access_token || null;
      // log("AUTH change", _evt, { token: !!t });
      if (t !== lastToken) {
        lastToken = t;
        try {
          supabase.realtime.setAuth(t || undefined);
        } catch (e) {
          err("setAuth(onAuth)", e);
        }
      }
    });
    // store sub?.subscription if you want to unsubscribe on unmount
  }

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

  // const join = async () => {
  //   if (!import.meta.client || !supabase || !threadIdRef?.value) return;

  //   const user = useSupabaseUser?.()?.value || {};
  //   const myId = user?.id || null;

  //   console.debug("[presence] join called", {
  //     threadId: threadIdRef.value,
  //     myId,
  //   });

  //   channel = supabase.channel(`presence:thread:${threadIdRef.value}`, {
  //     config: { presence: { key: `user:${myId || "anon"}` } },
  //   });
  //   log(
  //     "CHANNEL create",
  //     channel.topic,
  //     "channels=",
  //     supabase.getChannels?.().length || "n/a"
  //   );

  //   // Optional channel-level diagnostics (supported by v2):
  //   channel.on("system", { event: "close" }, (p) => warn("CH close", p));
  //   channel.on("system", { event: "error" }, (p) => err("CH error", p));

  //   channel.on("presence", { event: "sync" }, async () => {
  //     const state = channel.presenceState();
  //     const metas = [];
  //     Object.keys(state).forEach((k) => state[k].forEach((m) => metas.push(m)));

  //     const ids = [...new Set(metas.map((m) => m.userId).filter(Boolean))];
  //     await fetchProfiles(ids);

  //     now.value = metas.map((m) => {
  //       const prof = m.userId ? profileCache.value[m.userId] : null;
  //       return {
  //         ...m,
  //         displayname: prof?.displayname ?? m.displayname ?? "Anonymous",
  //         avatarUrl: prof?.avatar_url ?? m.avatarUrl ?? null,
  //       };
  //     });

  //     console.debug("[presence] sync metas:", now.value.slice(0, 3));
  //   });

  //   channel.subscribe(async (status) => {
  //     const ch = channel; // capture for this callback
  //     if (status === "SUBSCRIBED") {
  //       console.debug("[presence] SUBSCRIBED, fetching profile for", myId);
  //       let myDisplay = user?.user_metadata?.displayname || "User";
  //       let myAvatar = user?.user_metadata?.avatar_url || null;

  //       if (myId) {
  //         const {
  //           data: me,
  //           error,
  //           status,
  //         } = await supabase
  //           .from("profiles")
  //           .select("user_id, displayname, avatar_url")
  //           .eq("user_id", myId)
  //           .maybeSingle();

  //         console.debug("[presence] profile fetch result", {
  //           status,
  //           error,
  //           me,
  //         });

  //         if (me) {
  //           profileCache.value[myId] = {
  //             displayname: me.displayname || null,
  //             avatar_url: me.avatar_url || null,
  //           };
  //           myDisplay = me.displayname || myDisplay;
  //           myAvatar = me.avatar_url || myAvatar;
  //         }
  //       }

  //       if (ch !== channel || !channel) {
  //         console.debug("[presence] track skipped (channel changed)");
  //         return;
  //       }

  //       channel.track({
  //         userId: myId,
  //         displayname: myDisplay,
  //         avatarUrl: myAvatar,
  //       });

  //       console.debug("[presence] track payload", {
  //         userId: myId,
  //         displayname: myDisplay,
  //       });
  //     }
  //   });
  // };








const join = async () => {
  if (!import.meta.client || !supabase || !threadIdRef?.value) return;

  const user = useSupabaseUser?.()?.value || {};
  const myId = user?.id || null;
  console.debug("[presence] join called", { threadId: threadIdRef.value, myId });

  // 1) Create the new channel, but DO NOT remove the old yet (handoff pattern)
  const old = channel;
  const next = supabase.channel(`presence:thread:${threadIdRef.value}`, {
    config: { presence: { key: `user:${myId || "anon"}` } },
  });
  // log("CHANNEL create", next.topic, "channels=", supabase.getChannels?.().length || "n/a");

  // channel-level diagnostics
  next.on("system", { event: "close" }, (p) => warn("CH close", p));
  next.on("system", { event: "error" }, (p) => err("CH error", p));

  // presence sync handler
  next.on("presence", { event: "sync" }, async () => {
    const state = next.presenceState();
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
  });

  // 2) Wait until the new channel is fully SUBSCRIBED, then track
  await new Promise((resolve) => {
    next.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") return;
      // freshen self profile (optional)
      let myDisplay = user?.user_metadata?.displayname || "User";
      let myAvatar = user?.user_metadata?.avatar_url || null;
      if (myId) {
        const { data: me } = await supabase
          .from("profiles")
          .select("user_id, displayname, avatar_url")
          .eq("user_id", myId)
          .maybeSingle();
        if (me) {
          profileCache.value[myId] = {
            displayname: me.displayname || null,
            avatar_url: me.avatar_url || null,
          };
          myDisplay = me.displayname || myDisplay;
          myAvatar = me.avatar_url || myAvatar;
        }
      }
      try {
        await next.track({ userId: myId, displayname: myDisplay, avatarUrl: myAvatar });
        console.debug("[presence] track payload", { userId: myId, displayname: myDisplay });
      } catch {}
      resolve();
    });
  });

  // 3) Swap references, THEN remove the old channel (no zero-channel gap)
  channel = next;
  if (old) {
    // log("CHANNEL remove BEGIN", old.topic, "channels=", supabase.getChannels?.().length || "n/a");
    try { await old.unsubscribe?.(); } catch (e) { log("unsubscribe error", e?.message || e); }
    try { supabase.removeChannel(old); } catch (e) { log("removeChannel error", e?.message || e); }
    // log("CHANNEL remove END", "channels=", supabase.getChannels?.().length || "n/a");
  }
};







  const leave = async () => {
    if (!supabase || !channel) return;

    const oldChannel = channel; // capture current reference
    // log(
    //   "CHANNEL remove BEGIN",
    //   oldChannel?.topic,
    //   "channels=",
    //   supabase.getChannels?.().length || "n/a"
    // );

    try {
      await oldChannel.unsubscribe?.(); // cleanly unsubscribe first
    } catch (e) {
      // log("unsubscribe error", e?.message || e);
    }

 // Defer actual removal so the next page can subscribe first
 setTimeout(() => {
   try { supabase.removeChannel(oldChannel); } catch (e) {
    //  log("removeChannel error", e?.message || e);
   }
  //  log("CHANNEL remove END (deferred)", "channels=", supabase.getChannels?.().length || "n/a");
 }, 300); // 200–400 ms works well in practice

    channel = null;
  };

  onMounted(join);
  onUnmounted(leave);

  return { now, recent, join, leave };
};
