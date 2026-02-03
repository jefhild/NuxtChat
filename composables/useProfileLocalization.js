const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return null;
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  if (code.startsWith("en")) return "en";
  const base = code.split("-")[0];
  return SUPPORTED_LOCALES.includes(base) ? base : null;
};

const buildTranslationMap = (translations = []) => {
  const map = new Map();
  for (const entry of translations) {
    const locale = normalizeLocale(entry?.locale);
    if (!locale) continue;
    map.set(locale, entry);
  }
  return map;
};

const pickField = (locales, map, key) => {
  for (const locale of locales) {
    const entry = map.get(locale);
    if (entry && typeof entry[key] === "string" && entry[key].trim()) {
      return { value: entry[key].trim(), locale };
    }
  }
  return { value: null, locale: null };
};

const clampText = (value, maxLength = 45) => {
  if (!value) return value;
  if (!maxLength || maxLength <= 0) return value;
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
};

export const resolveProfileLocalization = ({
  profile,
  readerLocale,
  overrideLocale,
  fallbackLocales = ["en"],
  taglineMaxLength = 45,
} = {}) => {
  const translations = Array.isArray(profile?.profile_translations)
    ? profile.profile_translations
    : [];
  const map = buildTranslationMap(translations);

  const orderedLocales = [
    normalizeLocale(overrideLocale),
    normalizeLocale(readerLocale),
    normalizeLocale(profile?.preferred_locale),
    ...fallbackLocales.map(normalizeLocale),
  ].filter(Boolean);

  const displayname = pickField(orderedLocales, map, "displayname");
  const bio = pickField(orderedLocales, map, "bio");
  const tagline = pickField(orderedLocales, map, "tagline");

  return {
    displayname: displayname.value || profile?.displayname || "",
    bio: bio.value || profile?.bio || "",
    tagline: clampText(tagline.value || profile?.tagline || "", taglineMaxLength),
    displaynameLocale: displayname.locale,
    bioLocale: bio.locale,
    taglineLocale: tagline.locale,
  };
};

export const getProfileTranslationLocales = (profile) => {
  const translations = Array.isArray(profile?.profile_translations)
    ? profile.profile_translations
    : [];
  const locales = new Set();
  translations.forEach((entry) => {
    const locale = normalizeLocale(entry?.locale);
    if (locale) locales.add(locale);
  });
  const preferred = normalizeLocale(profile?.preferred_locale);
  if (preferred) locales.add(preferred);
  locales.add("en");
  return Array.from(locales);
};

export { normalizeLocale };
