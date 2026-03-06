import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAdmin } from "~/server/utils/adminAuth";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const id = params.id;
    if (!id) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing engagement rule id" };
    }

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);
    const { error } = await supabase
      .from("ai_engagement_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    const err = error as any;
    console.error("[admin/engagement-rules] delete error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage || err?.message || "Unable to delete engagement rule",
    };
  }
});
