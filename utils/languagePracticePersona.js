const LANGUAGE_CODES = ["en", "fr", "ru", "zh"];
const TARGET_LEVELS = ["a1", "a2", "b1", "b2", "c1", "c2", "unsure"];
const CORRECTION_PREFERENCES = [
  "no_corrections",
  "light_corrections",
  "active_corrections",
];
const EXCHANGE_MODES = [
  "practice_only",
  "reciprocal_exchange",
  "native_helper",
];
const ASSISTANT_ROLES = [
  "conversation_partner",
  "tutor",
  "native_helper",
  "topic_starter",
  "correction_helper",
];

export const DEFAULT_LANGUAGE_PRACTICE_PERSONA_CONFIG = Object.freeze({
  enabled: false,
  assistant_role: "conversation_partner",
  supported_target_languages: [],
  supported_native_languages: [],
  supported_levels: [],
  default_correction_preference: "light_corrections",
  default_exchange_mode: "practice_only",
  system_prompt_template: null,
  response_style_template: null,
});

const asObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};

const normalizeToken = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const normalizeLanguageCode = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  return null;
};

const normalizeArray = (values, normalizer, allowedValues = null) => {
  const list = Array.isArray(values) ? values : [];
  const seen = new Set();
  return list
    .map((value) => normalizer(value))
    .filter((value) => {
      if (!value) return false;
      if (allowedValues && !allowedValues.includes(value)) return false;
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
};

export function getLanguagePracticePersonaConfig(metadata) {
  const meta = asObject(metadata);
  const raw = asObject(meta.language_practice);
  const assistantRole = normalizeToken(raw.assistant_role);
  const correctionPreference = normalizeToken(raw.default_correction_preference);
  const exchangeMode = normalizeToken(raw.default_exchange_mode);
  const systemPromptTemplate = String(raw.system_prompt_template || "").trim();
  const responseStyleTemplate = String(raw.response_style_template || "").trim();

  return {
    ...DEFAULT_LANGUAGE_PRACTICE_PERSONA_CONFIG,
    enabled: Boolean(raw.enabled),
    assistant_role: ASSISTANT_ROLES.includes(assistantRole)
      ? assistantRole
      : DEFAULT_LANGUAGE_PRACTICE_PERSONA_CONFIG.assistant_role,
    supported_target_languages: normalizeArray(
      raw.supported_target_languages,
      normalizeLanguageCode,
      LANGUAGE_CODES
    ),
    supported_native_languages: normalizeArray(
      raw.supported_native_languages,
      normalizeLanguageCode,
      LANGUAGE_CODES
    ),
    supported_levels: normalizeArray(
      raw.supported_levels,
      normalizeToken,
      TARGET_LEVELS
    ),
    default_correction_preference: CORRECTION_PREFERENCES.includes(
      correctionPreference
    )
      ? correctionPreference
      : DEFAULT_LANGUAGE_PRACTICE_PERSONA_CONFIG.default_correction_preference,
    default_exchange_mode: EXCHANGE_MODES.includes(exchangeMode)
      ? exchangeMode
      : DEFAULT_LANGUAGE_PRACTICE_PERSONA_CONFIG.default_exchange_mode,
    system_prompt_template: systemPromptTemplate || null,
    response_style_template: responseStyleTemplate || null,
  };
}

export function isLanguagePracticePersonaEnabled(personaOrMetadata) {
  const metadata =
    personaOrMetadata && typeof personaOrMetadata === "object" && "metadata" in personaOrMetadata
      ? personaOrMetadata.metadata
      : personaOrMetadata;
  return getLanguagePracticePersonaConfig(metadata).enabled;
}

export function getLanguagePracticePersonaDiagnostics(personaOrMetadata) {
  const persona =
    personaOrMetadata && typeof personaOrMetadata === "object" && "metadata" in personaOrMetadata
      ? personaOrMetadata
      : { metadata: personaOrMetadata };
  const config = getLanguagePracticePersonaConfig(persona.metadata);
  const issues = [];

  if (!config.enabled) issues.push("Language Practice toggle is off");
  if (persona && "is_active" in persona && !persona.is_active) {
    issues.push("Bot is inactive");
  }
  if (persona && "list_publicly" in persona && !persona.list_publicly) {
    issues.push("Public listing is off");
  }
  if (persona?.profile && "is_ai" in persona.profile && !persona.profile.is_ai) {
    issues.push("Linked profile is not marked as AI");
  }

  return {
    enabled: config.enabled,
    ready: issues.length === 0,
    issues,
    config,
  };
}

export function buildLanguagePracticePersonaMetadata(metadata, configInput) {
  const meta = asObject(metadata);
  const config = getLanguagePracticePersonaConfig({
    language_practice: configInput,
  });

  return {
    ...meta,
    language_practice: {
      enabled: config.enabled,
      assistant_role: config.assistant_role,
      supported_target_languages: config.supported_target_languages,
      supported_native_languages: config.supported_native_languages,
      supported_levels: config.supported_levels,
      default_correction_preference: config.default_correction_preference,
      default_exchange_mode: config.default_exchange_mode,
      system_prompt_template: config.system_prompt_template,
      response_style_template: config.response_style_template,
    },
  };
}

export const LANGUAGE_PRACTICE_PERSONA_OPTIONS = Object.freeze({
  languageCodes: LANGUAGE_CODES,
  targetLevels: TARGET_LEVELS,
  correctionPreferences: CORRECTION_PREFERENCES,
  exchangeModes: EXCHANGE_MODES,
  assistantRoles: ASSISTANT_ROLES,
});
