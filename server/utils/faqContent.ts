const DEFAULT_LOCALE = "en-US";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
};

export const normalizeFaqLocale = (value: unknown) => {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCALE;
  return LOCALE_MAP[trimmed] || trimmed;
};

export const fetchFaqEntriesByIds = async (
  supabase: any,
  entryIds: string[],
  locale: string
) => {
  const ids = Array.from(
    new Set(entryIds.map((item) => String(item || "").trim()).filter(Boolean))
  );
  if (!ids.length) return [];

  const normalizedLocale = normalizeFaqLocale(locale);
  const localeList =
    normalizedLocale === DEFAULT_LOCALE
      ? [normalizedLocale]
      : [normalizedLocale, DEFAULT_LOCALE];

  const [entriesResponse, translationsResponse] = await Promise.all([
    supabase
      .from("faq_entries")
      .select("id, slug, sort_order, is_active")
      .in("id", ids)
      .eq("is_active", true),
    supabase
      .from("faq_translations")
      .select("entry_id, locale, question, answer")
      .in("entry_id", ids)
      .in("locale", localeList),
  ]);

  if (entriesResponse.error) throw entriesResponse.error;
  if (translationsResponse.error) throw translationsResponse.error;

  const translationMap = new Map<
    string,
    Record<string, { question: string; answer: string }>
  >();

  (translationsResponse.data || []).forEach((translation: any) => {
    if (!translationMap.has(translation.entry_id)) {
      translationMap.set(translation.entry_id, {});
    }
    translationMap.get(translation.entry_id)![translation.locale] = {
      question: translation.question,
      answer: translation.answer,
    };
  });

  const sortMap = new Map(
    (entriesResponse.data || []).map((entry: any) => [
      entry.id,
      {
        slug: entry.slug || null,
        sortOrder: entry.sort_order ?? 0,
      },
    ])
  );

  return ids
    .map((id) => {
      const translations = translationMap.get(id) || {};
      const translation =
        translations[normalizedLocale] || translations[DEFAULT_LOCALE];
      if (!translation?.question || !translation?.answer) return null;
      const meta = sortMap.get(id);
      return {
        id,
        slug: meta?.slug || null,
        sortOrder: meta?.sortOrder ?? 0,
        question: translation.question,
        answer: translation.answer,
      };
    })
    .filter(Boolean);
};
