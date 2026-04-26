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
import {
  fetchProfileLanguagePreferenceMap,
  isExplicitLanguagePracticePreference,
  withLanguagePreferenceFallback,
} from "@/server/utils/profileLanguagePreferences";

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
const OFFLINE_FETCH_LIMIT = 120;
const parseBooleanQuery = (value: unknown) =>
  ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

const normalizeSignalQuery = (value: unknown): string | null => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized || null;
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const locale = normalizeLocale(query.locale);
  const languagePracticeOnly = parseBooleanQuery(query.languagePracticeOnly);
  const selectedEmotion = normalizeSignalQuery(query.emotion);
  const selectedIntent = normalizeSignalQuery(query.intent);
  const selectedEnergy = normalizeSignalQuery(query.energy);
  const hasSelectedMood = !!(selectedEmotion || selectedIntent || selectedEnergy);
  const supabase = await getServiceRoleClient(event);

  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();
  const recentCutoff = new Date(
    Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  // 1. Honey bots — always online
  const honeyProfiles = languagePracticeOnly
    ? []
    : ((await supabase
        .from("ai_personas")
        .select(`
          profile:profiles!ai_personas_profile_user_id_fkey (
            user_id,
            displayname,
            avatar_url,
            tagline,
            preferred_locale,
            gender_id,
            profile_translations(locale, displayname, tagline),
            countries:country_id (emoji)
          )
        `)
        .eq("is_active", true)
        .eq("honey_enabled", true)
        .limit(20)).data || [])
        .filter((p: any) => p.profile?.user_id)
        .map((p: any) => p.profile);

  const honeyIds = new Set(honeyProfiles.map((p: any) => p.user_id));

  // 2. Real online users — presence table OR last_active within 10 min
  const [presenceRes, lastActiveRes] = await Promise.all([
    supabase.from("presence").select("user_id").gte("last_seen_at", onlineCutoff),
    supabase.from("profiles")
      .select("user_id, displayname, avatar_url, tagline, preferred_locale, gender_id, agent_enabled, profile_translations(locale, displayname, tagline), countries:country_id (emoji)")
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
    .select("user_id, displayname, avatar_url, tagline, preferred_locale, gender_id, agent_enabled, profile_translations(locale, displayname, tagline), countries:country_id (emoji)")
    .eq("is_ai", false)
    .eq("is_private", false)
    .gte("last_active", recentCutoff)
    .order("last_active", { ascending: false })
    .limit(OFFLINE_FETCH_LIMIT);

  const offlineProfiles = (recentProfiles || []).filter(
    (p: any) => !onlineRealIds.has(p.user_id) && !honeyIds.has(p.user_id)
  );

  const candidateIds = [
    ...honeyProfiles.map((p: any) => p.user_id),
    ...onlineRealProfiles.map((p: any) => p.user_id),
    ...offlineProfiles.map((p: any) => p.user_id),
  ].filter(Boolean);

  const languagePreferenceMap = await fetchProfileLanguagePreferenceMap(
    supabase,
    candidateIds
  );
  const shouldIncludeCandidate = (userId: string) =>
    !languagePracticeOnly ||
    isExplicitLanguagePracticePreference(languagePreferenceMap.get(userId));

  const filteredOnlineRealProfiles = onlineRealProfiles.filter((profile: any) =>
    shouldIncludeCandidate(profile.user_id)
  );
  const filteredOfflineProfiles = offlineProfiles.filter((profile: any) =>
    shouldIncludeCandidate(profile.user_id)
  );

  const allIds = [
    ...honeyProfiles.map((p: any) => p.user_id),
    ...filteredOnlineRealProfiles.map((p: any) => p.user_id),
    ...filteredOfflineProfiles.map((p: any) => p.user_id),
  ].filter(Boolean);

  const intakeMap = new Map<string, any>();
  if (allIds.length > 0) {
    const { data: intakes } = await supabase
      .from("match_intakes_latest")
      .select("user_id, emotion, intent, energy, native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode")
      .in("user_id", allIds);
    (intakes || []).forEach((row: any) => intakeMap.set(row.user_id, row));
  }

  function toCard(p: any) {
    const intake = withLanguagePreferenceFallback(
      intakeMap.get(p.user_id),
      languagePreferenceMap.get(p.user_id),
      { preferredLocale: p.preferred_locale }
    );
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
      native_language_code: intake?.native_language_code ?? null,
      target_language_code: intake?.target_language_code ?? null,
      target_language_level: intake?.target_language_level ?? null,
      correction_preference: intake?.correction_preference ?? null,
      language_exchange_mode: intake?.language_exchange_mode ?? null,
      score: null,
    };
  }

  const scoreCard = (card: any) => {
    let score = 0;
    if (selectedEmotion && card.emotion === selectedEmotion) score += 1;
    if (selectedIntent && card.intent === selectedIntent) score += 2;
    if (selectedEnergy && card.energy === selectedEnergy) score += 1;
    return score;
  };

  const rankCards = (cards: any[]) => {
    if (!hasSelectedMood) return cards;
    const scored = cards.map((card) => ({ card, score: scoreCard(card) }));
    const positive = scored.filter((entry) => entry.score > 0);
    const ranked = (positive.length ? positive : scored).sort((a, b) => b.score - a.score);
    return ranked.map((entry) => entry.card);
  };

  return {
    online: rankCards([...honeyProfiles, ...filteredOnlineRealProfiles].map(toCard)).slice(0, 20),
    offline: rankCards(filteredOfflineProfiles.map(toCard)).slice(0, OFFLINE_LIMIT),
  };
});
