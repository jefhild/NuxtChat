import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    const { data, error } = await supabase
      .from("ai_engagement_rules")
      .select("*")
      .order("context", { ascending: true })
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const err = error as any;
    console.error("[admin/engagement-rules] list error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to load engagement rules",
    };
  }
});
