import enUS from "../../i18n/locales/en-US.json";
import frFR from "../../i18n/locales/fr-FR.json";
import ruRU from "../../i18n/locales/ru-RU.json";
import zhCN from "../../i18n/locales/zh-CN.json";

type LocaleData = Record<string, unknown>;

const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const LOCALE_DATA: Record<SupportedLocale, LocaleData> = {
  en: enUS as LocaleData,
  fr: frFR as LocaleData,
  ru: ruRU as LocaleData,
  zh: zhCN as LocaleData,
};

function normalizeLocale(locale: string): SupportedLocale {
  const code = locale?.split("-")[0]?.toLowerCase();
  return (SUPPORTED_LOCALES as readonly string[]).includes(code)
    ? (code as SupportedLocale)
    : "en";
}

function getNestedValue(obj: LocaleData, key: string): string | null {
  const parts = key.split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === "string" ? current : null;
}

/**
 * Translate a dot-notation key for a given locale, with variable interpolation.
 * Falls back to English if the key is missing in the target locale.
 * Falls back to the key itself if missing in both.
 *
 * @example t('emails.digest.subject', 'fr')
 * @example t('emails.digest.greeting', 'zh', { name: 'Alice' })
 */
export function t(
  key: string,
  locale: string,
  vars?: Record<string, string | number>
): string {
  const normalized = normalizeLocale(locale);

  let value =
    getNestedValue(LOCALE_DATA[normalized], key) ??
    getNestedValue(LOCALE_DATA["en"], key) ??
    key;

  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      value = value.replaceAll(`{${k}}`, String(v));
    }
  }

  return value;
}
