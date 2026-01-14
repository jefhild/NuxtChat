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
    const messageId = String(body.message_id || "");
    if (!messageId) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "message_id required" } };
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
      console.error("[admin/messages-read] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data, error } = await supa
      .from("messages")
      .update({ read: true })
      .eq("id", messageId)
      .select("id, read")
      .maybeSingle();

    if (error) {
      console.error("[admin/messages-read] update error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "update", message: error.message } };
    }

    return { item: data };
  } catch (err) {
    console.error("[admin/messages-read] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
