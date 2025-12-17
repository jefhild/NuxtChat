import { getServiceRoleClient } from "~/server/utils/aiBots";

const PUBLIC_PERSONA_SELECT = `
  id,
  persona_key,
  role,
  bias,
  angle,
  region,
  language_code,
  category:categories!ai_personas_category_id_fkey (
    id,
    name,
    slug
  ),
  profile:profiles!ai_personas_profile_user_id_fkey (
    user_id,
    displayname,
    slug,
    avatar_url,
    tagline,
    bio,
    gender_id,
    is_ai
  )
`;

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    const { data, error } = await supabase
      .from("ai_personas")
      .select(PUBLIC_PERSONA_SELECT)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const personas = (data || []).filter((persona: any) => persona?.profile?.is_ai);

    return { success: true, data: personas };
  } catch (err: any) {
    console.error("[ai-personas] list error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to load AI personas",
    };
  }
});
