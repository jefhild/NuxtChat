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
      console.error("[admin/chat-messages] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const select =
      "id, sender_id, receiver_id, content, created_at, read, receiver:profiles!messages_receiver_id_fkey(displayname, avatar_url, slug)";

    const { data, error } = await supa
      .from("messages")
      .select(select)
      .eq("sender_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[admin/chat-messages] query error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "query", message: error.message } };
    }

    return { items: Array.isArray(data) ? data : [] };
  } catch (err) {
    console.error("[admin/chat-messages] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
