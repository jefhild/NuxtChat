import { normalizeLearningLanguageCode } from "@/server/utils/languageLearning";

export type ProfileLanguagePreference = {
  user_id: string;
  native_language_code: string | null;
  target_language_code: string | null;
  target_language_level: string | null;
  correction_preference: string | null;
  language_exchange_mode: string | null;
  source?: string | null;
};

const EXPLICIT_LANGUAGE_PRACTICE_SOURCES = new Set([
  "user_onboarding",
  "profile_settings",
  "ai_persona",
  "seed",
  "admin",
]);

export async function fetchProfileLanguagePreferenceMap(
  supabase: any,
  userIds: string[]
): Promise<Map<string, ProfileLanguagePreference>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const preferenceMap = new Map<string, ProfileLanguagePreference>();
  if (ids.length === 0) return preferenceMap;

  const { data } = await supabase
    .from("profile_language_preferences_active")
    .select("user_id, native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode, source")
    .in("user_id", ids);

  (data || []).forEach((row: ProfileLanguagePreference) => {
    preferenceMap.set(row.user_id, row);
  });

  return preferenceMap;
}

export function isExplicitLanguagePracticePreference(
  preference: ProfileLanguagePreference | null | undefined
) {
  const source = String(preference?.source || "").trim().toLowerCase();
  return EXPLICIT_LANGUAGE_PRACTICE_SOURCES.has(source);
}

export function withLanguagePreferenceFallback(
  intake: any,
  preference: ProfileLanguagePreference | null | undefined,
  options: { preferredLocale?: unknown } = {}
) {
  if (!intake && !preference) return null;

  const defaultNativeLanguage = normalizeLearningLanguageCode(
    options.preferredLocale
  );
  const preferenceSource = String(preference?.source || "").trim().toLowerCase();
  const shouldPreferProfileDefaultNative =
    !preferenceSource || preferenceSource === "match_intake_backfill";

  return {
    ...(intake || {}),
    native_language_code:
      shouldPreferProfileDefaultNative
        ? defaultNativeLanguage ??
          preference?.native_language_code ??
          intake?.native_language_code ??
          null
        : preference?.native_language_code ??
          intake?.native_language_code ??
          defaultNativeLanguage ??
          null,
    target_language_code:
      preference?.target_language_code ?? intake?.target_language_code ?? null,
    target_language_level:
      preference?.target_language_level ?? intake?.target_language_level ?? null,
    correction_preference:
      preference?.correction_preference ??
      intake?.correction_preference ??
      null,
    language_exchange_mode:
      preference?.language_exchange_mode ??
      intake?.language_exchange_mode ??
      null,
  };
}
