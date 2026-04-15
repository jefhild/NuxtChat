import { getServiceRoleClient } from "~/server/utils/aiBots";
import { serverSupabaseUser } from "#supabase/server";
import { isLanguagePracticePersonaEnabled } from "@/utils/languagePracticePersona";

const PUBLIC_PERSONA_SELECT = `
  id,
  persona_key,
  role,
  list_publicly,
  editorial_enabled,
  counterpoint_enabled,
  honey_enabled,
  honey_delay_min_ms,
  honey_delay_max_ms,
  metadata,
  bias,
  angle,
  region,
  language_code,
  mood_group,
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
    is_ai,
    profile_translations (
      locale,
      displayname,
      tagline,
      bio,
      angle
    )
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

    const personas = (data || [])
      .filter((persona: any) => {
        if (!persona?.profile?.is_ai) return false;
        if (persona?.honey_enabled && !allowHoney) return false;
        return true;
      })
      .map((persona: any) => ({
        ...persona,
        language_practice_enabled: isLanguagePracticePersonaEnabled(persona),
        metadata: undefined,
      }));

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
