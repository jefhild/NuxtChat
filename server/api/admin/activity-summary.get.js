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
      console.error("[admin/activity-summary] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const [
      { count: chatCount, error: chatCountError },
      { data: chatLast, error: chatLastError },
      { data: aiLimitRows, count: aiLimitCount, error: aiLimitError },
    ] = await Promise.all([
      supa
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId),
      supa
        .from("messages")
        .select("created_at")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supa
        .from("messages")
        .select("id, sender_id, content, created_at", { count: "exact" })
        .eq("receiver_id", userId)
        .ilike("content", "%AI limit%")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (
      chatCountError ||
      chatLastError ||
      aiLimitError
    ) {
      const error =
        chatCountError ||
        chatLastError ||
        aiLimitError;
      console.error("[admin/activity-summary] query error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "counts", message: error.message } };
    }

    return {
      data: {
        chatCount: chatCount || 0,
        discussionCount: 0,
        chatLastAt: chatLast?.created_at || null,
        discussionLastAt: null,
        discussionThreads: [],
        discussionSampleSize: 0,
        discussionUpvotes: 0,
        discussionDownvotes: 0,
        voteSampleSize: 0,
        aiLimitHitsCount: aiLimitCount || 0,
        aiLimitLastAt: aiLimitRows?.[0]?.created_at || null,
        aiLimitHitsSample: (aiLimitRows || []).map((row) => ({
          id: row.id,
          sender_id: row.sender_id,
          created_at: row.created_at,
          content: row.content,
        })),
      },
    };
  } catch (err) {
    console.error("[admin/activity-summary] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
