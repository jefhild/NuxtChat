import { AI_PERSONA_SELECT, getServiceRoleClient } from "~/server/utils/aiBots";

const BASIC_AI_PERSONA_SELECT = `
  id,
  persona_key,
  profile_user_id,
  is_active,
  model,
  category:categories!ai_personas_category_id_fkey (
    name
  ),
  profile:profiles!ai_personas_profile_user_id_fkey (
    displayname
  )
`;

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    let { data, error } = await supabase
      .from("ai_personas")
      .select(AI_PERSONA_SELECT)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn(
        "[admin/ai-bots] full select failed, retrying with basic fields:",
        error
      );
      const fallback = await supabase
        .from("ai_personas")
        .select(BASIC_AI_PERSONA_SELECT)
        .order("created_at", { ascending: false });
      data = fallback.data;
      error = fallback.error;
    }

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
