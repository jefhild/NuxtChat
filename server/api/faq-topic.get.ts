import { getServiceRoleClient } from "~/server/utils/aiBots";

const DEFAULT_LOCALE = "en-US";

const LOCALE_MAP: Record<string, string> = {
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
};

const normalizeLocale = (value: unknown) => {
  if (typeof value !== "string") return DEFAULT_LOCALE;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_LOCALE;
  return LOCALE_MAP[trimmed] || trimmed;
};

const pickTranslation = (
  map: Record<string, string> | undefined,
  locale: string,
  fallback: string
): string => {
  if (!map) return "";
  return map[locale] || map[fallback] || "";
};

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const slug = String(query.slug || "").trim().toLowerCase();

    if (!slug) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing slug", data: null };
    }

    const locale = normalizeLocale(query.locale);
    const fallbackLocale = DEFAULT_LOCALE;
    const localeList =
      locale === fallbackLocale ? [locale] : [locale, fallbackLocale];

    const supabase = await getServiceRoleClient(event);

    const { data: topicRow, error: topicError } = await supabase
      .from("faq_topics")
      .select("id, group_id, slug, sort_order")
      .eq("slug", slug)
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (topicError) throw topicError;

    if (!topicRow) {
      setResponseStatus(event, 404);
      return { success: false, error: "Topic not found", data: null };
    }

    const [
      topicTranslationsResponse,
      groupResponse,
      groupTranslationsResponse,
      entriesResponse,
    ] = await Promise.all([
      supabase
        .from("faq_topic_translations")
        .select("locale, title")
        .eq("topic_id", topicRow.id)
        .in("locale", localeList),
      supabase
        .from("faq_groups")
        .select("id, slug, sort_order")
        .eq("id", topicRow.group_id)
        .maybeSingle(),
      supabase
        .from("faq_group_translations")
        .select("locale, title")
        .eq("group_id", topicRow.group_id)
        .in("locale", localeList),
      supabase
        .from("faq_entries")
        .select("id, slug, sort_order")
        .eq("topic_id", topicRow.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    for (const res of [
      topicTranslationsResponse,
      groupResponse,
      groupTranslationsResponse,
      entriesResponse,
    ]) {
      if (res.error) throw res.error;
    }

    const entryIds = (entriesResponse.data || []).map((e: any) => String(e.id));

    const entryTranslationsResponse = entryIds.length
      ? await supabase
          .from("faq_translations")
          .select("entry_id, locale, question, answer")
          .in("entry_id", entryIds)
          .in("locale", localeList)
      : { data: [], error: null };

    if (entryTranslationsResponse.error) throw entryTranslationsResponse.error;

    const topicTitleMap: Record<string, string> = {};
    (topicTranslationsResponse.data || []).forEach((t: any) => {
      topicTitleMap[t.locale] = t.title;
    });

    const groupTitleMap: Record<string, string> = {};
    (groupTranslationsResponse.data || []).forEach((t: any) => {
      groupTitleMap[t.locale] = t.title;
    });

    const groupRow = groupResponse.data;
    const topicTitle =
      pickTranslation(topicTitleMap, locale, fallbackLocale) || topicRow.slug;
    const groupTitle = groupRow
      ? pickTranslation(groupTitleMap, locale, fallbackLocale) || groupRow.slug
      : "";

    const entryTranslationMap = new Map<
      string,
      Record<string, { question: string; answer: string }>
    >();
    (entryTranslationsResponse.data || []).forEach((t: any) => {
      if (!entryTranslationMap.has(t.entry_id)) {
        entryTranslationMap.set(t.entry_id, {});
      }
      entryTranslationMap.get(t.entry_id)![t.locale] = {
        question: t.question,
        answer: t.answer,
      };
    });

    const entries = (entriesResponse.data || [])
      .map((entry: any) => {
        const translations = entryTranslationMap.get(entry.id) || {};
        const translation =
          translations[locale] || translations[fallbackLocale];
        if (!translation?.question || !translation?.answer) return null;
        return {
          id: entry.id,
          slug: entry.slug || null,
          sortOrder: entry.sort_order ?? 0,
          question: translation.question,
          answer: translation.answer,
        };
      })
      .filter(Boolean);

    return {
      success: true,
      data: {
        topic: {
          id: topicRow.id,
          slug: topicRow.slug,
          title: topicTitle,
          groupId: groupRow?.id || topicRow.group_id,
          groupSlug: groupRow?.slug || null,
          groupTitle,
        },
        entries,
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[faq-topic] fetch error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to load FAQ topic",
      data: null,
    };
  }
});
