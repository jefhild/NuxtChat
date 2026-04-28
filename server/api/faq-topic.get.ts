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
    const slug = String(query.slug || query.topic || "").trim().toLowerCase();
    const groupSlug = String(query.group || "").trim().toLowerCase();

    if (!slug) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing slug", data: null };
    }

    const locale = normalizeLocale(query.locale);
    const fallbackLocale = DEFAULT_LOCALE;
    const localeList =
      locale === fallbackLocale ? [locale] : [locale, fallbackLocale];

    const supabase = await getServiceRoleClient(event);

    let topicQuery = supabase
      .from("faq_topics")
      .select("id, group_id, slug, sort_order")
      .eq("slug", slug)
      .eq("is_active", true);

    if (groupSlug) {
      const { data: groupRowBySlug, error: groupLookupError } = await supabase
        .from("faq_groups")
        .select("id")
        .eq("slug", groupSlug)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (groupLookupError) throw groupLookupError;

      if (!groupRowBySlug?.id) {
        setResponseStatus(event, 404);
        return { success: false, error: "Topic not found", data: null };
      }

      topicQuery = topicQuery.eq("group_id", groupRowBySlug.id);
    }

    const { data: topicRow, error: topicError } = await topicQuery
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
      siblingTopicsResponse,
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
      supabase
        .from("faq_topics")
        .select("id, slug, sort_order")
        .eq("group_id", topicRow.group_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

    for (const res of [
      topicTranslationsResponse,
      groupResponse,
      groupTranslationsResponse,
      entriesResponse,
      siblingTopicsResponse,
    ]) {
      if (res.error) throw res.error;
    }

    const entryIds = (entriesResponse.data || []).map((e: any) => String(e.id));
    const siblingTopics = siblingTopicsResponse.data || [];
    const siblingTopicIds = siblingTopics.map((topic: any) => String(topic.id));

    const [entryTranslationsResponse, siblingTopicTranslationsResponse, siblingEntriesResponse] =
      await Promise.all([
        entryIds.length
          ? supabase
              .from("faq_translations")
              .select("entry_id, locale, question, answer")
              .in("entry_id", entryIds)
              .in("locale", localeList)
          : Promise.resolve({ data: [], error: null }),
        siblingTopicIds.length
          ? supabase
              .from("faq_topic_translations")
              .select("topic_id, locale, title")
              .in("topic_id", siblingTopicIds)
              .in("locale", localeList)
          : Promise.resolve({ data: [], error: null }),
        siblingTopicIds.length
          ? supabase
              .from("faq_entries")
              .select("topic_id")
              .in("topic_id", siblingTopicIds)
              .eq("is_active", true)
          : Promise.resolve({ data: [], error: null }),
      ]);

    if (entryTranslationsResponse.error) throw entryTranslationsResponse.error;
    if (siblingTopicTranslationsResponse.error) {
      throw siblingTopicTranslationsResponse.error;
    }
    if (siblingEntriesResponse.error) throw siblingEntriesResponse.error;

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

    const siblingTitleMap = new Map<string, Record<string, string>>();
    (siblingTopicTranslationsResponse.data || []).forEach((translation: any) => {
      if (!siblingTitleMap.has(translation.topic_id)) {
        siblingTitleMap.set(translation.topic_id, {});
      }
      siblingTitleMap.get(translation.topic_id)![translation.locale] =
        translation.title;
    });

    const siblingEntryCount = new Map<string, number>();
    (siblingEntriesResponse.data || []).forEach((entry: any) => {
      const topicId = String(entry.topic_id || "").trim();
      if (!topicId) return;
      siblingEntryCount.set(topicId, (siblingEntryCount.get(topicId) || 0) + 1);
    });

    const relatedTopics = siblingTopics
      .map((topic: any) => ({
        id: topic.id,
        slug: topic.slug,
        sortOrder: topic.sort_order ?? 0,
        title:
          pickTranslation(
            siblingTitleMap.get(topic.id),
            locale,
            fallbackLocale
          ) || topic.slug,
        groupSlug: groupRow?.slug || groupSlug || null,
        entryCount: siblingEntryCount.get(topic.id) || 0,
        current: topic.id === topicRow.id,
      }))
      .filter((topic) => topic.entryCount > 0);

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
        relatedTopics,
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
