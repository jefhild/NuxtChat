// server/api/admin/articles/unpublish.post.js
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { threadId, articleId, force = false } = body || {};

    if (!threadId && !articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "Provide threadId or articleId" };
    }

    // Lazy import to avoid Nitro import-time errors
    const { useDb } = await import("@/composables/useDB");
    const { getServerClientFrom } = useDb();
    const cfg = useRuntimeConfig(event);
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    // 1) Locate the thread (kind='article')
    let tQuery = supa
      .from("threads")
      .select("id, kind, article_id")
      .eq("kind", "article")
      .limit(1);

    if (threadId) tQuery = tQuery.eq("id", threadId);
    if (articleId) tQuery = tQuery.eq("article_id", articleId);

    const { data: found, error: findErr } = await tQuery.single();
    if (findErr || !found) {
      setResponseStatus(event, 404);
      return { success: false, error: "Thread not found for given id(s)." };
    }
    const tid = found.id;

    // 2) Count messages for safety
    const { data: msgCountData, error: countErr } = await supa
      .from("messages_v2")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", tid);

    if (countErr) {
      setResponseStatus(event, 500);
      return { success: false, error: countErr.message };
    }
    const messageCount = msgCountData?.length ?? 0; // head:true → use count via response; fallback length

    // 3) If there are messages and not forcing, bail with info
    if (messageCount > 0 && !force) {
      return {
        success: false,
        error: "Thread has messages; refusing to unpublish without force.",
        info: {
          threadId: tid,
          messageCount,
          hint: "Call with { force: true } to delete messages and thread.",
        },
      };
    }

    // 4) If forcing, delete messages first (prevents FK issues)
    if (messageCount > 0 && force) {
      const { error: delMsgsErr } = await supa
        .from("messages_v2")
        .delete()
        .eq("thread_id", tid);

      if (delMsgsErr) {
        setResponseStatus(event, 500);
        return { success: false, error: delMsgsErr.message };
      }
    }

    // 5) Delete the thread row
    const { error: delThreadErr } = await supa
      .from("threads")
      .delete()
      .eq("id", tid)
      .eq("kind", "article");

    if (delThreadErr) {
      setResponseStatus(event, 500);
      return { success: false, error: delThreadErr.message };
    }

    return {
      success: true,
      threadId: tid,
      deletedMessages: force ? messageCount : 0,
    };
  } catch (e) {
    console.error("[unpublish] handler error:", e);
    setResponseStatus(event, 500);
    return { success: false, error: String(e?.message || e) };
  }
});
