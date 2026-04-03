<template>
  <SeoPageIndex
    :kicker="copy.kicker"
    :title="copy.title"
    :description="copy.description"
    :intro="copy.intro"
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
        "Parfois, on a juste besoin de quelqu'un à qui parler — et ces sujets sont là pour vous aider à trouver ce que ça veut dire pour vous. Explorez par humeur, objectif, ou ce qui vous passe par la tête, et trouvez votre entrée.",
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
        "Иногда просто нужен кто-то, с кем поговорить — и эти темы помогут вам разобраться, что именно вам нужно. Просматривайте по настроению, цели или тому, что сейчас на уме, и найдите свой путь.",
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
        "有时候，你只是需要一个可以倾诉的人——这些主题就是帮你弄清楚那对你意味着什么。按心情、目标，或者脑海中任何想法去浏览，找到属于你的入口。",
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
      "Sometimes you just need someone to talk to — and these topics are here to help you figure out what that looks like for you. Browse by mood, goal, or whatever's on your mind, and find your way in.",
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
