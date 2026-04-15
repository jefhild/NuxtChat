import { defineEventHandler, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import { normalizeLearningLanguageCode } from "@/server/utils/languageLearning";
import { isExplicitLanguagePracticePreference } from "@/server/utils/profileLanguagePreferences";

const buildDefaultPreference = (preferredLocale: unknown) => ({
  is_active: false,
  native_language_code: normalizeLearningLanguageCode(preferredLocale),
  target_language_code: null,
  target_language_level: "unsure",
  correction_preference: "light_corrections",
  language_exchange_mode: "practice_only",
  source: "profile_settings",
  updated_at: null,
});

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const supabase = await getServiceRoleClient(event);

  const [{ data: profile, error: profileError }, { data: preference, error: preferenceError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("preferred_locale")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profile_language_preferences_active")
        .select(
          "native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode, source, updated_at"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: profileError.message });
  }

  if (preferenceError) {
    throw createError({ statusCode: 500, statusMessage: preferenceError.message });
  }

  const defaults = buildDefaultPreference(profile?.preferred_locale);
  const isExplicitPreference = isExplicitLanguagePracticePreference(preference);

  return {
    preference: preference && isExplicitPreference
      ? {
          ...defaults,
          ...preference,
          is_active: true,
        }
      : defaults,
  };
});
