import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAdmin } from "~/server/utils/adminAuth";

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);
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
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error:
        err?.statusMessage || err?.message || "Unable to load engagement rules",
    };
  }
});
