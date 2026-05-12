<template>
  <SeoPageIndex
    :kicker="copy.kicker"
    :title="copy.title"
    :description="copy.description"
    :intro="copy.intro"
    :support-text="copy.supportText"
    :browse-label="copy.browseLabel"
    :sibling-hubs="copy.siblingHubs"
    :summary-title-formatter="copy.summaryTitle"
    :pages="pages"
  />
</template>

<script setup>
const { locale } = useI18n();

const { data } = await useAsyncData(
  () => `seo-index-topics-${locale.value}`,
  () => $fetch("/api/seo-pages", { query: { type: "topic", locale: locale.value } })
);

const pages = computed(() => data.value?.pages || []);
const baseLocale = computed(() =>
  String(locale.value || "en")
    .split("-")[0]
    .trim()
    .toLowerCase()
);
const copy = computed(() => {
  if (baseLocale.value === "fr") {
    return {
      kicker: "Sujets",
      title: "Sujets de chat",
      description:
        "Parcourez des pages autour de la rencontre en ligne, de l'amitié et des raisons qui poussent à commencer une conversation.",
      intro:
        "Explorez des sujets autour du chat anonyme, des nouvelles rencontres et des échanges linguistiques pour trouver le type de conversation qui correspond à votre humeur ou à votre objectif.",
      supportText:
        "Des articles de fond qui explorent les humeurs, la pratique des langues, les situations et les idées autour du chat en ligne.",
      browseLabel: "Parcourir les sujets",
      summaryTitle: (count) => `${count} sujets pour explorer avant de discuter`,
      siblingHubs: [
        { label: "Voir les comparaisons", href: "/compare" },
        { label: "Voir les guides", href: "/guides" },
      ],
      metaTitle: "Sujets pour rencontrer des gens en ligne | ImChatty",
      metaDescription:
        "Explorez des sujets autour du chat anonyme, du fait de se faire des amis en ligne et de la découverte par la conversation.",
      metaOgDescription:
        "Des pages thématiques qui relient de larges intentions de recherche à l'expérience ImChatty.",
    };
  }
  if (baseLocale.value === "ru") {
    return {
      kicker: "Темы",
      title: "Темы чата",
      description:
        "Изучайте страницы о знакомстве онлайн, дружбе и причинах, по которым люди начинают разговор.",
      intro:
        "Изучайте темы об анонимном чате, знакомстве с новыми людьми и языковом обмене, чтобы найти формат разговора, который подходит вашему настроению или цели.",
      supportText:
        "Содержательные материалы о настроениях, языковой практике, ситуациях и идеях, которые стоят за онлайн-чатом.",
      browseLabel: "Смотреть темы",
      summaryTitle: (count) => `${count} темы, которые стоит изучить до начала чата`,
      siblingHubs: [
        { label: "Смотреть сравнения", href: "/compare" },
        { label: "Смотреть гайды", href: "/guides" },
      ],
      metaTitle: "Темы о знакомстве онлайн | ImChatty",
      metaDescription:
        "Изучайте темы об анонимном чате, поиске друзей онлайн и общении через разговор.",
      metaOgDescription:
        "Тематические страницы, которые связывают широкие поисковые намерения с опытом ImChatty.",
    };
  }
  if (baseLocale.value === "zh") {
    return {
      kicker: "主题",
      title: "聊天主题",
      description:
        "浏览围绕在线认识人、交朋友以及人们为什么想开始一段对话的主题页面。",
      intro:
        "探索与匿名聊天、结识新朋友和语言交换相关的话题，找到符合你当下心情或目标的对话方式。",
      supportText:
        "更深入的内容，围绕在线聊天背后的情绪、语言练习、具体情境和想法展开。",
      browseLabel: "浏览话题",
      summaryTitle: (count) => `${count} 个主题，帮你在聊天前先了解方向`,
      siblingHubs: [
        { label: "查看对比", href: "/compare" },
        { label: "查看指南", href: "/guides" },
      ],
      metaTitle: "在线认识人的主题页 | ImChatty",
      metaDescription:
        "探索围绕匿名聊天、网上交友和对话式发现的主题页面。",
      metaOgDescription:
        "把广泛搜索意图连接到 ImChatty 产品体验的主题页面。",
    };
  }
  return {
    kicker: "Topics",
    title: "Chat topics",
    description:
      "Browse topic pages around meeting people online, making friends, and the reasons people start new conversations.",
    intro:
      "Explore topics around anonymous chat, meeting new people, and language exchange to find the kind of conversation that matches your mood or goal.",
    supportText:
      "Thoughtful pieces that explore the moods, language practice, situations, and ideas behind online chat.",
    browseLabel: "Browse topics",
    summaryTitle: (count) => `${count} topics to explore`,
    siblingHubs: [
      { label: "Browse comparisons", href: "/compare" },
      { label: "Browse guides", href: "/guides" },
    ],
    metaTitle: "Meet People Online Topics | ImChatty",
    metaDescription:
      "Explore topic pages around anonymous chat, making friends online, and conversation-based discovery.",
    metaOgDescription:
      "Topic pages that connect broad search intent to the ImChatty product experience.",
  };
});

useSeoI18nMeta("home", {
  dynamic: {
    title: copy.value.metaTitle,
    description: copy.value.metaDescription,
    ogTitle: copy.value.metaTitle,
    ogDescription: copy.value.metaOgDescription,
  },
});
</script>
