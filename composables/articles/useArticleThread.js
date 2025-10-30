import { ref, onMounted, onUnmounted } from "vue";
import { useDb } from "@/composables/useDB";

export const useArticleThread = (threadIdRef) => {
  const isValidId = (id) => typeof id === "string" && id.length > 10;

  const { getClient } = useDb();
  const supabase = import.meta.client ? getClient() : null;

  //----------------

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
      log("setAuth skipped (unchanged)");
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

  //----------------

  const messages = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  let channel = null;
  const knownIds = new Set();
  const knownClientIds = new Set();

  const seeded = ref(false);

  const seed = (initial = []) => {
    if (seeded.value) return;
    messages.value = Array.isArray(initial) ? initial.slice() : [];
    seeded.value = true;
  };

  const normalizeRow = (r) =>
    !r
      ? r
      : {
          id: r.id,
          threadId: r.thread_id ?? r.threadId,
          senderKind: r.sender_kind ?? r.senderKind,
          senderUserId: r.sender_user_id ?? r.senderUserId,
          content: r.content,
          visible: r.visible,
          createdAt: r.created_at ?? r.createdAt,
          replyToMessageId: r.reply_to_message_id ?? r.replyToMessageId,
          meta: r.meta ?? null,
      };
  
  const loadInitial = async (limit = 50) => {
    if (!threadIdRef?.value || !isValidId(threadIdRef.value)) return;
    isLoading.value = true;
    error.value = null;
    try {
      const res = await $fetch(
        `/api/articles/threads/${threadIdRef.value}/messages`,
        {
          query: { limit },
        }
      );
      const items = Array.isArray(res?.items) ? res.items : [];
      // only replace if API actually returned items
      if (items.length) {
        messages.value = items;
        knownIds.clear();
        knownClientIds.clear();
        for (const m of items) {
          if (m?.id) knownIds.add(m.id);
          const cid = m?.meta?.clientId;
          if (cid) knownClientIds.add(cid);
        }
      }
    } catch (e) {
      error.value = e;
    } finally {
      isLoading.value = false;
    }
  };

  const applyInsert = (row) => {
    const cid = row?.meta?.clientId;
    if ((row?.id && knownIds.has(row.id)) || (cid && knownClientIds.has(cid)))
      return;
    knownIds.add(row.id);
    if (cid) knownClientIds.add(cid);
    messages.value = [...messages.value, row];
  };

  const applyUpdate = (row) => {
    const idx = messages.value.findIndex((m) => m.id === row.id);
    if (idx === -1) return;
    if (row.visible === false) messages.value.splice(idx, 1);
    else messages.value.splice(idx, 1, row);
  };

  const subscribe = () => {
    if (
      !import.meta.client ||
      !supabase ||
      !threadIdRef?.value ||
      !isValidId(threadIdRef.value)
    )
      return () => {};
    maybeSetAuthOnce().catch(() => {});
    channel = supabase
      .channel(`thread:${threadIdRef.value}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_v2",
          filter: `thread_id=eq.${threadIdRef.value}`,
        },
        (payload) => applyInsert(normalizeRow(payload.new))
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages_v2",
          filter: `thread_id=eq.${threadIdRef.value}`,
        },
        (payload) => applyUpdate(normalizeRow(payload.new))
      )
      .subscribe();
    // log(
    //   "CHANNEL create",
    //   `thread:${threadIdRef.value}`,
    //   "channels=",
    //   supabase.getChannels?.().length ?? "n/a"
    // );
    return () => {
      const ch = channel;
      channel = null;
      (async () => {
        try {
          await ch?.unsubscribe?.();
        } catch (e) {
          warn("unsubscribe err", e?.message || e);
        }
        setTimeout(() => {
          try {
            supabase.removeChannel(ch);
          } catch (e) {
            warn("removeChannel err", e?.message || e);
          }
          // log(
          //   "CHANNEL remove (deferred)",
          //   ch?.topic,
          //   "channels=",
          //   supabase.getChannels?.().length ?? "n/a"
          // );
        }, 250); // 200–400ms works well
      })();
    };
  };

  const send = async (text, { replyToId = null } = {}) => {
    if (!threadIdRef?.value) return;
    // get current authed user (client-only)
    const me =
      (typeof useSupabaseUser === "function"
        ? useSupabaseUser()?.value
        : null) || {};
    const meId = me?.id || null;
    const meDisplay = me?.user_metadata?.displayname || "You";
    const meAvatar = me?.user_metadata?.avatar_url || null;
    const clientId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
    applyInsert({
      id: `client:${clientId}`,
      threadId: threadIdRef.value,
      senderKind: "user",
      senderUserId: meId,
      content: text,
      createdAt: new Date().toISOString(),
      replyToMessageId: replyToId,
      meta: { clientId },
      // optional: inline view fields so UI looks perfect before RT replace
      displayname: meDisplay,
      avatarUrl: meAvatar,
      visible: true,
    });
    try {
      await $fetch("/api/articles/messages", {
        method: "POST",
        body: {
          threadId: threadIdRef.value,
          content: text,
          replyToMessageId: replyToId,
          clientId,
        },
      });
    } catch (e) {
      const idx = messages.value.findIndex(
        (m) => m.meta?.clientId === clientId
      );
      if (idx !== -1) messages.value.splice(idx, 1);
      throw e;
    }
  };

  onMounted(() => {
    loadInitial();
    const unsub = subscribe();

    // 👇 only join if authenticated
    const me =
      typeof useSupabaseUser === "function" ? useSupabaseUser()?.value : null;
    if (isValidId(threadIdRef.value) && me?.id) {
      $fetch("/api/articles/join", {
        method: "POST",
        body: { threadId: threadIdRef.value },
      })
        .then((r) => console.debug("join ok", r))
        .catch((e) => console.error("join failed", e));
    } else {
      console.debug(
        "skip join: me?.id=",
        me?.id,
        "threadId=",
        threadIdRef.value
      );
    }


    
    onUnmounted(() => {
      try {
        unsub?.();
      } catch {}
    });
  });

  return { messages, isLoading, error, loadInitial, send, seed };
};
