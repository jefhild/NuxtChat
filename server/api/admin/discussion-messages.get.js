import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const query = getQuery(event);
    const userId = String(query.user_id || "");
    const limit = Math.min(Number(query.limit || 60), 200);

    if (!userId) {
      setResponseStatus(event, 400);
      return { error: { stage: "query", message: "user_id required" } };
    }

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: me, error: meErr } = await supa
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (meErr) {
      console.error("[admin/discussion-messages] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data, error } = await supa
      .from("messages_v2")
      .select("id, thread_id, sender_user_id, content, created_at, deleted, masked")
      .eq("sender_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin/discussion-messages] query error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "query", message: error.message } };
    }

    const items = Array.isArray(data) ? data : [];
    const threadIds = Array.from(
      new Set(items.map((row) => row.thread_id).filter(Boolean))
    );

    let threadMap = new Map();
    if (threadIds.length) {
      const { data: threads, error: threadsErr } = await supa
        .from("threads")
        .select("id, title, slug")
        .in("id", threadIds);
      if (threadsErr) {
        console.error("[admin/discussion-messages] threads error:", threadsErr);
      } else {
        threadMap = new Map((threads || []).map((t) => [t.id, t]));
      }
    }

    const enriched = items.map((row) => ({
      ...row,
      thread: threadMap.get(row.thread_id) || null,
    }));

    return { items: enriched };
  } catch (err) {
    console.error("[admin/discussion-messages] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
