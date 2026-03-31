/**
 * /api/match/public-personas
 *
 * Returns a list of publicly visible AI personas without requiring auth.
 * Used to populate the /match page for unauthenticated visitors so they see
 * real content rather than an empty state.
 */
import { defineEventHandler } from "h3";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import { inferTopicHint } from "@/server/utils/botPlatform";

export default defineEventHandler(async (event) => {
  const supabase = await getServiceRoleClient(event);

  const { data: aiPersonas } = await supabase
    .from("ai_personas")
    .select(`
      persona_key,
      profile:profiles!ai_personas_profile_user_id_fkey (
        user_id,
        displayname,
        avatar_url,
        tagline,
        countries:country_id (emoji)
      )
    `)
    .eq("is_active", true)
    .eq("honey_enabled", false)
    .eq("list_publicly", true)
    .limit(24);

  const profileIds = (aiPersonas || [])
    .map((p: any) => p.profile?.user_id)
    .filter(Boolean);

  // Fetch intakes so we can show emotion/intent badges
  let intakeMap = new Map<string, any>();
  if (profileIds.length > 0) {
    const { data: intakes } = await supabase
      .from("match_intakes_latest")
      .select("user_id, emotion, intent, energy, topic_hint")
      .in("user_id", profileIds);
    (intakes || []).forEach((row: any) => intakeMap.set(row.user_id, row));
  }

  const personas = (aiPersonas || [])
    .filter((p: any) => p.profile?.user_id)
    .map((p: any) => {
      const intake = intakeMap.get(p.profile.user_id) ?? null;
      return {
        user_id: p.profile.user_id,
        displayname: p.profile.displayname,
        avatar_url: p.profile.avatar_url,
        tagline: p.profile.tagline,
        country_emoji: p.profile.countries?.emoji ?? null,
        persona_key: p.persona_key,
        emotion: intake?.emotion ?? null,
        intent: intake?.intent ?? null,
        energy: intake?.energy ?? null,
        score: null,
      };
    });

  return { personas };
});
