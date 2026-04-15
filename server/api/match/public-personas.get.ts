/**
 * /api/match/public-personas
 *
 * Returns a list of publicly visible AI personas without requiring auth.
 * Used to populate the /match page for unauthenticated visitors so they see
 * real content rather than an empty state.
 */
import { defineEventHandler, getQuery } from "h3";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import {
  fetchProfileLanguagePreferenceMap,
  isExplicitLanguagePracticePreference,
  withLanguagePreferenceFallback,
} from "@/server/utils/profileLanguagePreferences";
import {
  getLanguagePracticePersonaConfig,
  isLanguagePracticePersonaEnabled,
} from "@/utils/languagePracticePersona";

const parseBooleanQuery = (value: unknown) =>
  ["1", "true", "yes", "on"].includes(String(value || "").trim().toLowerCase());

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const languagePracticeOnly = parseBooleanQuery(query.languagePracticeOnly);
  const supabase = await getServiceRoleClient(event);

  const { data: aiPersonas } = await supabase
    .from("ai_personas")
    .select(`
      persona_key,
      metadata,
      profile:profiles!ai_personas_profile_user_id_fkey (
        user_id,
        displayname,
        avatar_url,
        tagline,
        preferred_locale,
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
  const intakeMap = new Map<string, any>();
  if (profileIds.length > 0) {
    const { data: intakes } = await supabase
      .from("match_intakes_latest")
      .select("user_id, emotion, intent, energy, topic_hint, native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode")
      .in("user_id", profileIds);
    (intakes || []).forEach((row: any) => intakeMap.set(row.user_id, row));
  }

  const languagePreferenceMap = await fetchProfileLanguagePreferenceMap(
    supabase,
    profileIds
  );

  const personas = (aiPersonas || [])
    .filter((p: any) => p.profile?.user_id)
    .filter((p: any) =>
      !languagePracticeOnly ||
      (
        isExplicitLanguagePracticePreference(
          languagePreferenceMap.get(p.profile.user_id)
        ) &&
        isLanguagePracticePersonaEnabled(p)
      )
    )
    .map((p: any) => {
      const intake = withLanguagePreferenceFallback(
        intakeMap.get(p.profile.user_id),
        languagePreferenceMap.get(p.profile.user_id),
        { preferredLocale: p.profile?.preferred_locale }
      );
      const languagePracticeConfig = getLanguagePracticePersonaConfig(p.metadata);
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
        native_language_code: intake?.native_language_code ?? null,
        target_language_code: intake?.target_language_code ?? null,
        target_language_level: intake?.target_language_level ?? null,
        correction_preference: intake?.correction_preference ?? null,
        language_exchange_mode: intake?.language_exchange_mode ?? null,
        supported_target_languages:
          languagePracticeConfig.supported_target_languages ?? [],
        supported_native_languages:
          languagePracticeConfig.supported_native_languages ?? [],
        supported_levels: languagePracticeConfig.supported_levels ?? [],
        score: null,
      };
    });

  return { personas };
});
