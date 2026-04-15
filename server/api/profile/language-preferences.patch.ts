import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import {
  buildLanguageLearningPayload,
  normalizeLearningLanguageCode,
} from "@/server/utils/languageLearning";

const buildDefaultMode = (nativeLanguage: string | null, targetLanguage: string | null) => {
  if (targetLanguage) return "practice_only";
  if (nativeLanguage) return "native_helper";
  return null;
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  if (typeof body?.is_active !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "is_active (boolean) is required",
    });
  }

  const supabase = await getServiceRoleClient(event);

  if (!body.is_active) {
    const { error } = await supabase
      .from("profile_language_preferences")
      .update({
        is_active: false,
        is_primary: false,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id)
      .eq("is_active", true);

    if (error) {
      throw createError({ statusCode: 500, statusMessage: error.message });
    }

    return {
      success: true,
      preference: {
        is_active: false,
      },
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("preferred_locale")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) {
    throw createError({ statusCode: 500, statusMessage: profileError.message });
  }

  const payload = buildLanguageLearningPayload(body);
  const nativeLanguage =
    payload.native_language_code ??
    normalizeLearningLanguageCode(profile?.preferred_locale);
  const targetLanguage = payload.target_language_code ?? null;
  const targetLevel = payload.target_language_level ?? (targetLanguage ? "unsure" : null);
  const correctionPreference =
    payload.correction_preference ?? "light_corrections";
  const exchangeMode =
    payload.language_exchange_mode ??
    buildDefaultMode(nativeLanguage, targetLanguage);

  if (!nativeLanguage && !targetLanguage) {
    throw createError({
      statusCode: 400,
      statusMessage: "Choose at least one language to save language practice settings.",
    });
  }

  const activePayload = {
    user_id: user.id,
    native_language_code: nativeLanguage,
    target_language_code: targetLanguage,
    target_language_level: targetLevel,
    correction_preference: correctionPreference,
    language_exchange_mode: exchangeMode,
    is_active: true,
    is_primary: true,
    source: "profile_settings",
    updated_at: new Date().toISOString(),
  };

  const { data: existing, error: existingError } = await supabase
    .from("profile_language_preferences")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("is_primary", true)
    .maybeSingle();

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: existingError.message });
  }

  const query = existing?.id
    ? supabase
        .from("profile_language_preferences")
        .update(activePayload)
        .eq("id", existing.id)
    : supabase.from("profile_language_preferences").insert(activePayload);

  const { error } = await query;

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return {
    success: true,
    preference: {
      ...activePayload,
    },
  };
});
