import { getServiceRoleClient } from "~/server/utils/aiBots";
import { serverSupabaseUser } from "#supabase/server";

const PUBLIC_PERSONA_SELECT = `
  id,
  persona_key,
  role,
  list_publicly,
  editorial_enabled,
  counterpoint_enabled,
  honey_enabled,
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
    const caller = await serverSupabaseUser(event).catch(() => null);
    // Honey should be hidden only for fully authenticated users.
    // Unauthenticated/no-session and anonymous sessions can see honey personas.
    const allowHoney = !caller || !!caller?.is_anonymous;

    const supabase = await getServiceRoleClient(event);
    const { data, error } = await supabase
      .from("ai_personas")
      .select(PUBLIC_PERSONA_SELECT)
      .eq("is_active", true)
      .eq("list_publicly", true)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const personas = (data || []).filter((persona: any) => {
      if (!persona?.profile?.is_ai) return false;
      if (persona?.honey_enabled && !allowHoney) return false;
      return true;
    });

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
