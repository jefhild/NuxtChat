import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const body = (await readBody(event)) || {};
    const targetUserId = String(body.user_id || "").trim();
    const peerId = String(body.peer_id || "").trim();
    if (!targetUserId) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "user_id required" } };
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
      console.error("[admin/messages-delete] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    let del = supa.from("messages").delete({ count: "exact" });
    if (peerId) {
      del = del.or(
        `and(sender_id.eq.${targetUserId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${targetUserId})`
      );
    } else {
      del = del.or(
        `sender_id.eq.${targetUserId},receiver_id.eq.${targetUserId}`
      );
    }

    const { error, count } = await del;

    if (error) {
      console.error("[admin/messages-delete] delete error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: error.message } };
    }

    return { ok: true, deleted: count ?? null };
  } catch (err) {
    console.error("[admin/messages-delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
