// server/api/admin/articles/delete.post.js
export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { articleId, force = false } = body || {};

    if (!articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "articleId is required." };
    }

    const { useDb } = await import("@/composables/useDB");
    const { getServerClientFrom } = useDb();
    const cfg = useRuntimeConfig(event);
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: thread, error: threadErr } = await supa
      .from("threads")
      .select("id")
      .eq("kind", "article")
      .eq("article_id", articleId)
      .maybeSingle();

    if (threadErr) {
      setResponseStatus(event, 500);
      return { success: false, error: threadErr.message };
    }

    if (thread?.id) {
      const { data: msgCountData, error: countErr } = await supa
        .from("messages_v2")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", thread.id);

      if (countErr) {
        setResponseStatus(event, 500);
        return { success: false, error: countErr.message };
      }

      const messageCount = msgCountData?.length ?? 0;
      if (messageCount > 0 && !force) {
        return {
          success: false,
          error: "Thread has messages; refusing to delete without force.",
          info: { threadId: thread.id, messageCount },
        };
      }

      if (messageCount > 0 && force) {
        const { error: delMsgsErr } = await supa
          .from("messages_v2")
          .delete()
          .eq("thread_id", thread.id);

        if (delMsgsErr) {
          setResponseStatus(event, 500);
          return { success: false, error: delMsgsErr.message };
        }
      }

      const { error: delThreadErr } = await supa
        .from("threads")
        .delete()
        .eq("id", thread.id);

      if (delThreadErr) {
        setResponseStatus(event, 500);
        return { success: false, error: delThreadErr.message };
      }
    }

    await Promise.all([
      supa.from("article_tags").delete().eq("article_id", articleId),
      supa.from("article_people").delete().eq("article_id", articleId),
    ]);

    const { error: delArticleErr } = await supa
      .from("articles")
      .delete()
      .eq("id", articleId);

    if (delArticleErr) {
      setResponseStatus(event, 500);
      return { success: false, error: delArticleErr.message };
    }

    return { success: true };
  } catch (e) {
    console.error("[admin/articles] delete error:", e);
    setResponseStatus(event, 500);
    return { success: false, error: String(e?.message || e) };
  }
});
