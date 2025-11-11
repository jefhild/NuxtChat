import { AI_PERSONA_SELECT, getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    const { data, error } = await supabase
      .from("ai_personas")
      .select(AI_PERSONA_SELECT)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] list error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to load AI bots",
    };
  }
});
