import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const messageId = String(getRouterParam(event, "id") || "");
    if (!messageId) {
      setResponseStatus(event, 400);
      return { error: { stage: "params", message: "id required" } };
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
      console.error("[admin/chat-messages.delete] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { error } = await supa.from("messages").delete().eq("id", messageId);
    if (error) {
      console.error("[admin/chat-messages.delete] delete error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: error.message } };
    }

    return { success: true };
  } catch (err) {
    console.error("[admin/chat-messages.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
