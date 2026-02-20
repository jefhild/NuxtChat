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
      console.error(
        "[admin/discussion-messages.delete] admin check error:",
        meErr
      );
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data: existing, error: existingErr } = await supa
      .from("messages_v2")
      .select("id")
      .eq("id", messageId)
      .maybeSingle();
    if (existingErr) {
      console.error(
        "[admin/discussion-messages.delete] fetch message error:",
        existingErr
      );
      setResponseStatus(event, 500);
      return { error: { stage: "fetch_message", message: existingErr.message } };
    }
    if (!existing?.id) {
      setResponseStatus(event, 404);
      return { error: { stage: "fetch_message", message: "Message not found" } };
    }

    const { error: scoreError } = await supa
      .from("votes_unified")
      .delete()
      .eq("target_type", "message")
      .eq("target_id", messageId);
    if (scoreError) {
      console.error(
        "[admin/discussion-messages.delete] score delete error:",
        scoreError
      );
      setResponseStatus(event, 500);
      return { error: { stage: "delete_scores", message: scoreError.message } };
    }

    // Prevent FK failures when replies point to the message being deleted.
    const { error: unlinkRepliesError } = await supa
      .from("messages_v2")
      .update({ reply_to_message_id: null })
      .eq("reply_to_message_id", messageId);
    if (unlinkRepliesError) {
      console.error(
        "[admin/discussion-messages.delete] unlink replies error:",
        unlinkRepliesError
      );
      setResponseStatus(event, 500);
      return {
        error: { stage: "unlink_replies", message: unlinkRepliesError.message },
      };
    }

    const { error } = await supa
      .from("messages_v2")
      .delete()
      .eq("id", messageId);
    if (error) {
      console.error("[admin/discussion-messages.delete] delete error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: error.message } };
    }

    return { success: true };
  } catch (err) {
    console.error("[admin/discussion-messages.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
