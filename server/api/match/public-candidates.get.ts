/**
 * /api/match/public-candidates
 *
 * No-auth endpoint used to populate the /match page for unauthenticated visitors.
 * Returns two buckets:
 *   online  — honey bots (force_online, masquerade as real users)
 *   offline — recently-active real user profiles (last 7 days)
 *
 * No scoring is applied — results are sorted by recency / forced-online status.
 */
import { defineEventHandler } from "h3";
import { getServiceRoleClient } from "@/server/utils/aiBots";

const RECENT_DAYS = 7;
const OFFLINE_LIMIT = 20;

export default defineEventHandler(async (event) => {
  const supabase = await getServiceRoleClient(event);

  const recentCutoff = new Date(
    Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1. Honey bots — they appear as real users, always online
  const { data: honeyPersonas } = await supabase
    .from("ai_personas")
    .select(`
      profile:profiles!ai_personas_profile_user_id_fkey (
        user_id,
        displayname,
        avatar_url,
        tagline,
        countries:country_id (emoji)
      )
    `)
    .eq("is_active", true)
    .eq("honey_enabled", true)
    .limit(20);

  const honeyProfiles = (honeyPersonas || [])
    .filter((p: any) => p.profile?.user_id)
    .map((p: any) => p.profile);

  // 2. Recently-active real users (exclude AI profiles)
  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("user_id, displayname, avatar_url, tagline, countries:country_id (emoji)")
    .eq("is_ai", false)
    .gte("last_active", recentCutoff)
    .order("last_active", { ascending: false })
    .limit(OFFLINE_LIMIT);

  // 3. Collect all user IDs and fetch their mood intakes for badges
  const allIds = [
    ...honeyProfiles.map((p: any) => p.user_id),
    ...(recentProfiles || []).map((p: any) => p.user_id),
  ].filter(Boolean);

  let intakeMap = new Map<string, any>();
  if (allIds.length > 0) {
    const { data: intakes } = await supabase
      .from("match_intakes_latest")
      .select("user_id, emotion, intent, energy")
      .in("user_id", allIds);
    (intakes || []).forEach((row: any) => intakeMap.set(row.user_id, row));
  }

  function toCard(p: any) {
    const intake = intakeMap.get(p.user_id) ?? null;
    return {
      user_id: p.user_id,
      displayname: p.displayname,
      avatar_url: p.avatar_url,
      tagline: p.tagline,
      country_emoji: p.countries?.emoji ?? null,
      emotion: intake?.emotion ?? null,
      intent: intake?.intent ?? null,
      energy: intake?.energy ?? null,
      score: null,
    };
  }

  return {
    online: honeyProfiles.map(toCard),
    offline: (recentProfiles || []).map(toCard),
  };
});
