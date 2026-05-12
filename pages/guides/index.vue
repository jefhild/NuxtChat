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
        "Obtenez des réponses claires sur la confidentialité, la sécurité, le chat anonyme et l'apprentissage des langues pour savoir à quoi vous attendre avant de commencer.",
      supportText:
        "Des réponses utiles et des explications simples aux questions que la plupart des gens se posent avant de se lancer.",
      browseLabel: "Parcourir les guides",
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
        "Получите понятные ответы о приватности, безопасности, анонимном чате и изучении языков, чтобы заранее понимать, чего ожидать перед началом.",
      supportText:
        "Полезные ответы и простые объяснения на вопросы, которые у людей обычно возникают перед началом.",
      browseLabel: "Смотреть гайды",
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
        "围绕隐私、安全、匿名聊天和语言学习提供直接明了的解答，让你在开始之前先知道可以期待什么。",
      supportText:
        "用清楚易懂的方式回答人们在开始之前最常见的问题。",
      browseLabel: "浏览指南",
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
      "Get straightforward answers about privacy, safety, anonymous chat, and language learning so you know what to expect before you start.",
    supportText:
      "Helpful answers and simple explanations for the questions people usually have before they start.",
    browseLabel: "Browse guides",
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
