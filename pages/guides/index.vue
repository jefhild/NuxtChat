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
  () => `seo-index-guides-${locale.value}`,
  () => $fetch("/api/seo-pages", { query: { type: "guide", locale: locale.value } })
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
      kicker: "Guides",
      title: "Guides de chat",
      description:
        "Parcourez des guides pratiques sur le chat anonyme, la confidentialité et la meilleure façon de commencer sur ImChatty.",
      intro:
        "C'est normal d'avoir des questions avant de se lancer dans quelque chose de nouveau. Ces guides sont là pour vous donner des réponses honnêtes et claires — sur la confidentialité, ce à quoi vous attendre, et comment commencer en toute confiance.",
      summaryTitle: (count) => `${count} guides pour commencer plus sereinement`,
      siblingHubs: [
        { label: "Voir les comparaisons", href: "/compare" },
        { label: "Voir les sujets", href: "/topics" },
      ],
      metaTitle: "Guides sur le chat anonyme | ImChatty",
      metaDescription:
        "Explorez des guides pratiques sur le chat anonyme, la confidentialité et la prise en main d'ImChatty.",
      metaOgDescription:
        "Des guides durables qui expliquent l'expérience de chat et répondent aux questions courantes.",
    };
  }
  if (baseLocale.value === "ru") {
    return {
      kicker: "Гайды",
      title: "Гайды по чату",
      description:
        "Изучайте практические гайды об анонимном чате, приватности и о том, как проще начать пользоваться ImChatty.",
      intro:
        "Задавать вопросы перед чем-то новым — это нормально. Эти гайды дают честные и понятные ответы — о приватности, чего ожидать и как начать уверенно.",
      summaryTitle: (count) => `${count} гайда, чтобы начать увереннее`,
      siblingHubs: [
        { label: "Смотреть сравнения", href: "/compare" },
        { label: "Смотреть темы", href: "/topics" },
      ],
      metaTitle: "Гайды по анонимному чату | ImChatty",
      metaDescription:
        "Практические материалы об анонимном чате, приватности и начале работы с ImChatty.",
      metaOgDescription:
        "Постоянные гайды, которые объясняют формат чата и отвечают на частые вопросы.",
    };
  }
  if (baseLocale.value === "zh") {
    return {
      kicker: "指南",
      title: "聊天指南",
      description:
        "浏览关于匿名聊天、隐私以及如何更顺畅开始使用 ImChatty 的实用指南。",
      intro:
        "在尝试新事物之前有疑问是很正常的。这些指南提供诚实、直接的解答——关于隐私、该期待什么，以及如何自信地开始。",
      summaryTitle: (count) => `${count} 篇指南，帮你更从容地开始`,
      siblingHubs: [
        { label: "查看对比", href: "/compare" },
        { label: "查看主题", href: "/topics" },
      ],
      metaTitle: "匿名聊天指南 | ImChatty",
      metaDescription:
        "探索关于匿名聊天、隐私和如何开始使用 ImChatty 的实用指南。",
      metaOgDescription:
        "解释聊天体验并回答常见问题的常青指南。",
    };
  }
  return {
    kicker: "Guides",
    title: "Chat guides",
    description:
      "Browse practical guides covering anonymous chat, privacy, and the easiest ways to get started on ImChatty.",
    intro:
      "It's normal to have questions before jumping into something new. These guides are here to give you honest, straightforward answers — on privacy, what to expect, and how to get started confidently.",
    summaryTitle: (count) => `${count} guides to help you get started`,
    siblingHubs: [
      { label: "Browse comparisons", href: "/compare" },
      { label: "Browse topics", href: "/topics" },
    ],
    metaTitle: "Anonymous Chat Guides | ImChatty",
    metaDescription:
      "Explore practical guides about anonymous chat, privacy, and getting started on ImChatty.",
    metaOgDescription:
      "Evergreen guides that explain the chat experience and answer common questions.",
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
