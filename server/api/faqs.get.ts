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
  translations: Record<string, string> | undefined,
  locale: string,
  fallbackLocale: string
) => {
  if (!translations) return "";
  return translations[locale] || translations[fallbackLocale] || "";
};

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const locale = normalizeLocale(query.locale);
    const fallbackLocale = DEFAULT_LOCALE;
    const localeList =
      locale === fallbackLocale ? [locale] : [locale, fallbackLocale];

    const supabase = await getServiceRoleClient(event);

    const [
      groupsResponse,
      groupTranslationsResponse,
      topicsResponse,
      topicTranslationsResponse,
      entriesResponse,
      entryTranslationsResponse,
    ] = await Promise.all([
      supabase
        .from("faq_groups")
        .select("id, slug, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("faq_group_translations")
        .select("group_id, locale, title")
        .in("locale", localeList),
      supabase
        .from("faq_topics")
        .select("id, group_id, slug, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("faq_topic_translations")
        .select("topic_id, locale, title")
        .in("locale", localeList),
      supabase
        .from("faq_entries")
        .select("id, topic_id, slug, sort_order, is_active")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase
        .from("faq_translations")
        .select("entry_id, locale, question, answer")
        .in("locale", localeList),
    ]);

    const responses = [
      groupsResponse,
      groupTranslationsResponse,
      topicsResponse,
      topicTranslationsResponse,
      entriesResponse,
      entryTranslationsResponse,
    ];

    for (const response of responses) {
      if (response.error) throw response.error;
    }

    const groups = groupsResponse.data || [];
    const topics = topicsResponse.data || [];
    const entries = entriesResponse.data || [];

    const groupTranslations = groupTranslationsResponse.data || [];
    const topicTranslations = topicTranslationsResponse.data || [];
    const entryTranslations = entryTranslationsResponse.data || [];

    const groupTitleMap = new Map<string, Record<string, string>>();
    groupTranslations.forEach((translation) => {
      if (!groupTitleMap.has(translation.group_id)) {
        groupTitleMap.set(translation.group_id, {});
      }
      groupTitleMap.get(translation.group_id)![translation.locale] =
        translation.title;
    });

    const topicTitleMap = new Map<string, Record<string, string>>();
    topicTranslations.forEach((translation) => {
      if (!topicTitleMap.has(translation.topic_id)) {
        topicTitleMap.set(translation.topic_id, {});
      }
      topicTitleMap.get(translation.topic_id)![translation.locale] =
        translation.title;
    });

    const entryTranslationMap = new Map<
      string,
      Record<string, { question: string; answer: string }>
    >();
    entryTranslations.forEach((translation) => {
      if (!entryTranslationMap.has(translation.entry_id)) {
        entryTranslationMap.set(translation.entry_id, {});
      }
      entryTranslationMap.get(translation.entry_id)![translation.locale] = {
        question: translation.question,
        answer: translation.answer,
      };
    });

    const topicMap = new Map<
      string,
      {
        id: string;
        slug: string;
        groupId: string;
        sortOrder: number;
        title: string;
      }
    >();
    topics.forEach((topic) => {
      const title =
        pickTranslation(
          topicTitleMap.get(topic.id),
          locale,
          fallbackLocale
        ) || topic.slug;
      topicMap.set(topic.id, {
        id: topic.id,
        slug: topic.slug,
        groupId: topic.group_id,
        sortOrder: topic.sort_order ?? 0,
        title,
      });
    });

    const groupMap = new Map<
      string,
      {
        id: string;
        slug: string;
        sortOrder: number;
        title: string;
        topics: Array<{ id: string; slug: string; title: string }>;
      }
    >();

    groups.forEach((group) => {
      const title =
        pickTranslation(
          groupTitleMap.get(group.id),
          locale,
          fallbackLocale
        ) || group.slug;
      groupMap.set(group.id, {
        id: group.id,
        slug: group.slug,
        sortOrder: group.sort_order ?? 0,
        title,
        topics: [],
      });
    });

    topicMap.forEach((topic) => {
      const group = groupMap.get(topic.groupId);
      if (!group) return;
      group.topics.push({
        id: topic.id,
        slug: topic.slug,
        title: topic.title,
      });
    });

    groupMap.forEach((group) => {
      group.topics.sort((a, b) => a.title.localeCompare(b.title));
    });

    const entryItems = entries
      .map((entry) => {
        const topic = topicMap.get(entry.topic_id);
        const group = topic ? groupMap.get(topic.groupId) : null;
        if (!topic || !group) return null;

        const translationRecord = entryTranslationMap.get(entry.id) || {};
        const translation =
          translationRecord[locale] || translationRecord[fallbackLocale];

        return {
          id: entry.id,
          slug: entry.slug || null,
          sortOrder: entry.sort_order ?? 0,
          question: translation?.question || "",
          answer: translation?.answer || "",
          topicId: topic.id,
          topicTitle: topic.title,
          groupId: group.id,
          groupTitle: group.title,
          groupSort: group.sortOrder,
          topicSort: topic.sortOrder,
        };
      })
      .filter(Boolean) as Array<{
      id: string;
      sortOrder: number;
      question: string;
      answer: string;
      topicId: string;
      topicTitle: string;
      groupId: string;
      groupTitle: string;
      groupSort: number;
      topicSort: number;
    }>;

    entryItems.sort((a, b) => {
      if (a.groupSort !== b.groupSort) return a.groupSort - b.groupSort;
      if (a.topicSort !== b.topicSort) return a.topicSort - b.topicSort;
      return a.sortOrder - b.sortOrder;
    });

    const groupItems = Array.from(groupMap.values()).sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    return {
      success: true,
      data: {
        groups: groupItems,
        entries: entryItems,
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[faqs] fetch error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to load FAQs",
      data: {
        groups: [],
        entries: [],
      },
    };
  }
});
