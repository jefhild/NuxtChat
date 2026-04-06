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
import { defineEventHandler, getQuery } from "h3";
import { getServiceRoleClient } from "@/server/utils/aiBots";

const normalizeLocale = (value: unknown): string => {
  const code = String(value || "").trim().toLowerCase();
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

function resolvedField(profile: any, field: string, locale: string): string | null {
  const translations: any[] = profile.profile_translations || [];
  const exact = translations.find((t: any) => t.locale === locale);
  if (exact?.[field]) return exact[field];
  const en = translations.find((t: any) => t.locale === "en");
  if (en?.[field]) return en[field];
  return profile[field] ?? null;
}

const ONLINE_WINDOW_MS = 10 * 60 * 1000;
const RECENT_DAYS = 7;
const OFFLINE_LIMIT = 20;

export default defineEventHandler(async (event) => {
  const locale = normalizeLocale(getQuery(event).locale);
  const supabase = await getServiceRoleClient(event);

  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const recentCutoff = new Date(
    Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1. Honey bots — always online
  const { data: honeyPersonas } = await supabase
    .from("ai_personas")
    .select(`
      profile:profiles!ai_personas_profile_user_id_fkey (
        user_id,
        displayname,
        avatar_url,
        tagline,
        gender_id,
        profile_translations(locale, displayname, tagline),
        countries:country_id (emoji)
      )
    `)
    .eq("is_active", true)
    .eq("honey_enabled", true)
    .limit(20);

  const honeyProfiles = (honeyPersonas || [])
    .filter((p: any) => p.profile?.user_id)
    .map((p: any) => p.profile);

  const honeyIds = new Set(honeyProfiles.map((p: any) => p.user_id));

  // 2. Real online users — presence table OR last_active within 10 min
  const [presenceRes, lastActiveRes] = await Promise.all([
    supabase.from("presence").select("user_id").gte("last_seen_at", onlineCutoff),
    supabase.from("profiles")
      .select("user_id, displayname, avatar_url, tagline, gender_id, agent_enabled, profile_translations(locale, displayname, tagline), countries:country_id (emoji)")
      .eq("is_ai", false)
      .eq("is_private", false)
      .gte("last_active", onlineCutoff),
  ]);

  const onlineRealIds = new Set<string>([
    ...(presenceRes.data || []).map((r: any) => r.user_id),
    ...(lastActiveRes.data || []).map((r: any) => r.user_id),
  ]);

  const onlineRealProfiles = (lastActiveRes.data || []).filter(
    (p: any) => onlineRealIds.has(p.user_id) && !honeyIds.has(p.user_id)
  );

  // 3. Recently-active real users for offline bucket (exclude online users)
  const { data: recentProfiles } = await supabase
    .from("profiles")
    .select("user_id, displayname, avatar_url, tagline, gender_id, agent_enabled, profile_translations(locale, displayname, tagline), countries:country_id (emoji)")
    .eq("is_ai", false)
    .eq("is_private", false)
    .gte("last_active", recentCutoff)
    .order("last_active", { ascending: false })
    .limit(OFFLINE_LIMIT);

  const offlineProfiles = (recentProfiles || []).filter(
    (p: any) => !onlineRealIds.has(p.user_id) && !honeyIds.has(p.user_id)
  );

  // 4. Collect all user IDs and fetch mood intake badges
  const allIds = [
    ...honeyProfiles.map((p: any) => p.user_id),
    ...onlineRealProfiles.map((p: any) => p.user_id),
    ...offlineProfiles.map((p: any) => p.user_id),
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
      displayname: resolvedField(p, "displayname", locale),
      avatar_url: p.avatar_url,
      tagline: resolvedField(p, "tagline", locale),
      country_emoji: p.countries?.emoji ?? null,
      gender_id: p.gender_id ?? null,
      agent_enabled: p.agent_enabled ?? false,
      emotion: intake?.emotion ?? null,
      intent: intake?.intent ?? null,
      energy: intake?.energy ?? null,
      score: null,
    };
  }

  return {
    online: [...honeyProfiles, ...onlineRealProfiles].map(toCard),
    offline: offlineProfiles.map(toCard),
  };
});
