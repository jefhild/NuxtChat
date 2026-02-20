import { ref, onMounted, onUnmounted, watch } from "vue";
import { useDb } from "@/composables/useDB";

export const useArticleThread = (threadIdRef, localeRef = null) => {
  const isValidId = (id) => typeof id === "string" && id.length > 10;

  const { getClient } = useDb();
  const supabase = import.meta.client ? getClient() : null;
  const userRef =
    import.meta.client && typeof useSupabaseUser === "function"
      ? useSupabaseUser()
      : ref(null);

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
  const authorMetaByUserId = new Map();
  const authorMetaPromiseByUserId = new Map();
  let refreshTimer = null;
  let channel = null;
  let unsubscribe = null;
  let currentThreadId = null;
  const knownIds = new Set();
  const knownClientIds = new Set();
  let lastJoinKey = null;

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
      const locale =
        typeof localeRef?.value === "string" ? localeRef.value.trim() : "";
      const res = await $fetch(
        `/api/articles/threads/${threadIdRef.value}/messages`,
        {
          query: { limit, ...(locale ? { locale } : {}) },
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
          const uid = m?.authorId || m?.senderUserId || m?.sender_user_id || null;
          const displayname = m?.displayname || m?.author?.displayname || null;
          const avatarUrl = m?.avatarUrl || m?.author?.avatarUrl || null;
          if (uid && (displayname || avatarUrl)) {
            authorMetaByUserId.set(uid, { displayname, avatarUrl });
          }
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
    const senderUserId = row?.senderUserId || row?.sender_user_id || null;
    const cached = senderUserId ? authorMetaByUserId.get(senderUserId) : null;
    const seededRow =
      cached && row?.senderKind === "user"
        ? {
            ...row,
            displayname: row?.displayname || cached.displayname || null,
            avatarUrl: row?.avatarUrl || cached.avatarUrl || null,
          }
        : row;
    messages.value = [...messages.value, seededRow];

    // If incoming content is in a different locale, refresh from API so
    // translated display content can be materialized and rendered.
    const rowSourceLocale =
      seededRow?.sourceLocale ||
      seededRow?.meta?.source_locale ||
      seededRow?.meta?.original_language ||
      null;
    const targetLocale =
      typeof localeRef?.value === "string" ? localeRef.value.trim() : "";
    if (
      rowSourceLocale &&
      targetLocale &&
      String(rowSourceLocale).toLowerCase() !== String(targetLocale).toLowerCase()
    ) {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        loadInitial(50).catch(() => {});
      }, 450);
    }

    // Realtime INSERT payloads are bare rows; hydrate user display metadata lazily.
    if (
      supabase &&
      senderUserId &&
      row?.senderKind === "user" &&
      !seededRow?.displayname &&
      !authorMetaPromiseByUserId.has(senderUserId)
    ) {
      const p = supabase
        .from("profiles")
        .select("user_id, displayname, avatar_url")
        .eq("user_id", senderUserId)
        .maybeSingle()
        .then(({ data }) => {
          const displayname = data?.displayname || null;
          const avatarUrl = data?.avatar_url || null;
          authorMetaByUserId.set(senderUserId, { displayname, avatarUrl });
          if (!displayname && !avatarUrl) return;
          messages.value = (messages.value || []).map((m) => {
            const uid = m?.authorId || m?.senderUserId || m?.sender_user_id || null;
            if (uid !== senderUserId) return m;
            return {
              ...m,
              displayname: m?.displayname || displayname,
              avatarUrl: m?.avatarUrl || avatarUrl,
            };
          });
        })
        .catch(() => {})
        .finally(() => {
          authorMetaPromiseByUserId.delete(senderUserId);
        });
      authorMetaPromiseByUserId.set(senderUserId, p);
    }
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

  const tryJoin = async (threadId) => {
    if (!threadId || !isValidId(threadId)) return;
    const userId = userRef?.value?.id || null;
    if (!userId) return;
    const joinKey = `${userId}:${threadId}`;
    if (joinKey === lastJoinKey) return;
    lastJoinKey = joinKey;
    $fetch("/api/articles/join", {
      method: "POST",
      body: { threadId },
    })
      .then((r) => console.debug("join ok", r))
      .catch((e) => {
        lastJoinKey = null;
        console.error("join failed", e);
      });
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

  const syncThread = async (nextId) => {
    if (!nextId || !isValidId(nextId) || nextId === currentThreadId) return;
    currentThreadId = nextId;

    try {
      unsubscribe?.();
    } catch {}
    unsubscribe = null;

    await loadInitial();
    unsubscribe = subscribe();

    await tryJoin(nextId);
  };

  onMounted(() => {
    syncThread(threadIdRef?.value);
  });

  watch(
    () => threadIdRef?.value,
    (nextId) => {
      syncThread(nextId);
    }
  );

  watch(
    () => localeRef?.value,
    () => {
      loadInitial();
    }
  );

  watch(
    () => userRef?.value?.id,
    () => {
      tryJoin(threadIdRef?.value);
    }
  );

  onUnmounted(() => {
    try {
      unsubscribe?.();
    } catch {}
    if (refreshTimer) {
      clearTimeout(refreshTimer);
      refreshTimer = null;
    }
  });

  return { messages, isLoading, error, loadInitial, send, seed };
};
