import { defineEventHandler, readBody, createError } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "@/server/utils/aiBots";
import {
  buildLanguageLearningPayload,
  normalizeLearningLanguageCode,
} from "@/server/utils/languageLearning";

const normalizePartnerId = (value: unknown) => {
  const id = String(value || "").trim();
  return id || null;
};

const buildDefaultMode = (nativeLanguage: string | null, targetLanguage: string | null) => {
  if (targetLanguage) return "practice_only";
  if (nativeLanguage) return "native_helper";
  return "practice_only";
};

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }

  const body = await readBody(event);
  const partnerUserId = normalizePartnerId(
    body?.partner_user_id ?? body?.partnerUserId
  );

  if (!partnerUserId) {
    throw createError({
      statusCode: 400,
      statusMessage: "partner_user_id is required",
    });
  }

  if (partnerUserId === user.id) {
    throw createError({
      statusCode: 400,
      statusMessage: "A language practice session requires another participant.",
    });
  }

  const supabase = await getServiceRoleClient(event);
  const [{ data: myPreference }, { data: partnerProfile, error: partnerError }] =
    await Promise.all([
      supabase
        .from("profile_language_preferences_active")
        .select(
          "native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode"
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("user_id, is_ai")
        .eq("user_id", partnerUserId)
        .maybeSingle(),
    ]);

  if (partnerError) {
    throw createError({ statusCode: 500, statusMessage: partnerError.message });
  }

  if (!partnerProfile?.user_id) {
    throw createError({ statusCode: 404, statusMessage: "Partner not found" });
  }

  const input = buildLanguageLearningPayload(body);
  const targetLanguage =
    input.target_language_code ?? myPreference?.target_language_code ?? null;
  const nativeLanguage =
    input.native_language_code ?? myPreference?.native_language_code ?? null;
  const targetLevel =
    input.target_language_level ??
    myPreference?.target_language_level ??
    (targetLanguage ? "unsure" : null);
  const correctionPreference =
    input.correction_preference ??
    myPreference?.correction_preference ??
    "light_corrections";
  const exchangeMode =
    input.language_exchange_mode ??
    myPreference?.language_exchange_mode ??
    buildDefaultMode(nativeLanguage, targetLanguage);

  if (!normalizeLearningLanguageCode(targetLanguage)) {
    throw createError({
      statusCode: 400,
      statusMessage: "A target practice language is required to start a language chat.",
    });
  }

  const source = String(body?.source || "language_directory").trim() || "language_directory";
  const now = new Date().toISOString();

  const sessionPayload = {
    learner_user_id: user.id,
    partner_user_id: partnerUserId,
    target_language_code: targetLanguage,
    learner_native_language_code: nativeLanguage,
    target_language_level: targetLevel,
    correction_preference: correctionPreference,
    language_exchange_mode: exchangeMode,
    source,
    is_ai_partner: Boolean(partnerProfile.is_ai),
    status: "active",
    updated_at: now,
    ended_at: null,
  };

  const { data: existing, error: existingError } = await supabase
    .from("language_practice_sessions")
    .select("id")
    .eq("status", "active")
    .or(
      `and(learner_user_id.eq.${user.id},partner_user_id.eq.${partnerUserId}),and(learner_user_id.eq.${partnerUserId},partner_user_id.eq.${user.id})`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    throw createError({ statusCode: 500, statusMessage: existingError.message });
  }

  const query = existing?.id
    ? supabase
        .from("language_practice_sessions")
        .update(sessionPayload)
        .eq("id", existing.id)
    : supabase.from("language_practice_sessions").insert({
        ...sessionPayload,
        created_at: now,
      });

  const { error } = await query;

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const { data: saved, error: savedError } = await supabase
    .from("language_practice_sessions")
    .select("*")
    .eq("status", "active")
    .or(
      `and(learner_user_id.eq.${user.id},partner_user_id.eq.${partnerUserId}),and(learner_user_id.eq.${partnerUserId},partner_user_id.eq.${user.id})`
    )
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (savedError) {
    throw createError({ statusCode: 500, statusMessage: savedError.message });
  }

  return { session: saved || null };
});
