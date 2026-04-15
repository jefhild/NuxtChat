export const LANGUAGE_LEARNING_CODES = ["en", "fr", "ru", "zh"] as const;
export const TARGET_LANGUAGE_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2", "unsure"] as const;
export const CORRECTION_PREFERENCES = [
  "no_corrections",
  "light_corrections",
  "active_corrections",
] as const;
export const LANGUAGE_EXCHANGE_MODES = [
  "practice_only",
  "reciprocal_exchange",
  "native_helper",
] as const;

export type LanguageLearningPayload = {
  native_language_code: string | null;
  target_language_code: string | null;
  target_language_level: string | null;
  correction_preference: string | null;
  language_exchange_mode: string | null;
};

const normalizeToken = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

export const normalizeLearningLanguageCode = (value: unknown): string | null => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return null;
};

export const normalizeTargetLanguageLevel = (value: unknown): string | null => {
  const level = normalizeToken(value);
  const aliases: Record<string, string> = {
    beginner: "a1",
    elementary: "a2",
    intermediate: "b1",
    upper_intermediate: "b2",
    advanced: "c1",
    fluent: "c2",
    unknown: "unsure",
  };
  const normalized = aliases[level] || level;
  return (TARGET_LANGUAGE_LEVELS as readonly string[]).includes(normalized)
    ? normalized
    : null;
};

export const normalizeCorrectionPreference = (value: unknown): string | null => {
  const preference = normalizeToken(value);
  const aliases: Record<string, string> = {
    none: "no_corrections",
    no: "no_corrections",
    light: "light_corrections",
    active: "active_corrections",
    strict: "active_corrections",
  };
  const normalized = aliases[preference] || preference;
  return (CORRECTION_PREFERENCES as readonly string[]).includes(normalized)
    ? normalized
    : null;
};

export const normalizeLanguageExchangeMode = (value: unknown): string | null => {
  const mode = normalizeToken(value);
  const aliases: Record<string, string> = {
    exchange: "reciprocal_exchange",
    reciprocal: "reciprocal_exchange",
    practice: "practice_only",
    helper: "native_helper",
  };
  const normalized = aliases[mode] || mode;
  return (LANGUAGE_EXCHANGE_MODES as readonly string[]).includes(normalized)
    ? normalized
    : null;
};

export const buildLanguageLearningPayload = (
  input: Record<string, unknown> | null | undefined
): LanguageLearningPayload => {
  const nativeLanguage = normalizeLearningLanguageCode(
    input?.native_language_code ??
      input?.nativeLanguageCode ??
      input?.native_language ??
      input?.nativeLanguage
  );
  const targetLanguage = normalizeLearningLanguageCode(
    input?.target_language_code ??
      input?.targetLanguageCode ??
      input?.target_language ??
      input?.targetLanguage
  );
  const level = normalizeTargetLanguageLevel(
    input?.target_language_level ??
      input?.targetLanguageLevel ??
      input?.language_level ??
      input?.languageLevel
  );
  const correctionPreference = normalizeCorrectionPreference(
    input?.correction_preference ?? input?.correctionPreference
  );
  const exchangeMode =
    normalizeLanguageExchangeMode(
      input?.language_exchange_mode ??
        input?.languageExchangeMode ??
        input?.exchange_mode ??
        input?.exchangeMode
    ) || (targetLanguage ? "practice_only" : null);

  return {
    native_language_code: nativeLanguage,
    target_language_code: targetLanguage,
    target_language_level: level,
    correction_preference: correctionPreference,
    language_exchange_mode: exchangeMode,
  };
};
