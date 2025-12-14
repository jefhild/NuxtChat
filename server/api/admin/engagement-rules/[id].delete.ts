import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const id = params.id;
    if (!id) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing engagement rule id" };
    }

    const supabase = await getServiceRoleClient(event);
    const { error } = await supabase
      .from("ai_engagement_rules")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    const err = error as any;
    console.error("[admin/engagement-rules] delete error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to delete engagement rule",
    };
  }
});
