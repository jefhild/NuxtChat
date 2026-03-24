import type { AboutSectionKey } from "~/utils/aboutPageSections";
import { ABOUT_SECTION_KEYS } from "~/utils/aboutPageSections";

export const ABOUT_DEFAULT_LOCALE = "en-US";

const ABOUT_LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
};

export const normalizeAboutLocale = (value: unknown) => {
  if (typeof value !== "string") return ABOUT_DEFAULT_LOCALE;
  const trimmed = value.trim();
  if (!trimmed) return ABOUT_DEFAULT_LOCALE;
  return ABOUT_LOCALE_MAP[trimmed] || trimmed;
};

export const isMissingAboutTableError = (error: any) =>
  Boolean(
    error &&
      typeof error.message === "string" &&
      (error.message.includes("about_page_translations") ||
        error.message.includes("relation") && error.message.includes("does not exist"))
  );

export type AboutSectionTranslationRow = {
  section_key: AboutSectionKey;
  locale: string;
  title: string | null;
  body: string | null;
  updated_at?: string | null;
};

export const fetchAboutSectionTranslations = async (
  supabase: any,
  locale: string
) => {
  const normalizedLocale = normalizeAboutLocale(locale);
  const localeList =
    normalizedLocale === ABOUT_DEFAULT_LOCALE
      ? [normalizedLocale]
      : [normalizedLocale, ABOUT_DEFAULT_LOCALE];

  const { data, error } = await supabase
    .from("about_page_translations")
    .select("section_key, locale, title, body, updated_at")
    .in("section_key", [...ABOUT_SECTION_KEYS])
    .in("locale", localeList)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingAboutTableError(error)) {
      return {
        storageReady: false,
        sections: ABOUT_SECTION_KEYS.map((key) => ({
          key,
          locale: normalizedLocale,
          title: "",
          body: "",
          hasOverride: false,
        })),
      };
    }
    throw error;
  }

  const rows = (data || []) as AboutSectionTranslationRow[];
  const sections = ABOUT_SECTION_KEYS.map((key) => {
    const exact =
      rows.find((row) => row.section_key === key && row.locale === normalizedLocale) || null;
    const fallback =
      rows.find((row) => row.section_key === key && row.locale === ABOUT_DEFAULT_LOCALE) || null;
    const selected = exact || fallback;

    return {
      key,
      locale: exact?.locale || selected?.locale || normalizedLocale,
      title: String(selected?.title || "").trim(),
      body: String(selected?.body || "").trim(),
      hasOverride: Boolean(exact?.title || exact?.body),
    };
  });

  return {
    storageReady: true,
    sections,
  };
};

export const sanitizeAboutSectionPayload = (value: any) => {
  const key = String(value?.key || "").trim() as AboutSectionKey;
  if (!ABOUT_SECTION_KEYS.includes(key)) {
    return null;
  }

  return {
    key,
    title: String(value?.title || "").trim(),
    body: String(value?.body || "").trim(),
  };
};

