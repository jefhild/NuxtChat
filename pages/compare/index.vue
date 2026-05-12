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
  () => `seo-index-compare-${locale.value}`,
  () => $fetch("/api/seo-pages", { query: { type: "compare", locale: locale.value } })
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
      kicker: "Comparer",
      title: "Comparaisons de chat",
      description:
        "Parcourez des comparaisons de chat conçues pour aider chacun à choisir le format qui lui convient le mieux.",
      intro:
        "Comparez différents types de chat anonyme, de chat en ligne et de chat pour pratiquer une langue afin de voir ce qui vous convient le mieux et de commencer en confiance.",
      supportText:
        "Des comparaisons claires, côte à côte, pour vous aider à comprendre les différences et à choisir la voie qui vous convient.",
      browseLabel: "Parcourir les comparaisons",
      summaryTitle: (count) => `${count} comparaisons pour vous aider à choisir`,
      siblingHubs: [
        { label: "Voir les guides", href: "/guides" },
        { label: "Voir les sujets", href: "/topics" },
      ],
      metaTitle: "Comparer les options de chat anonyme | ImChatty",
      metaDescription:
        "Pages de comparaison pour le chat anonyme, le chat axé sur le texte et les alternatives recherchées avant d'entrer en conversation.",
      metaOgDescription:
        "Parcourez des pages de comparaison orientées recherche et passez au chat quand vous êtes prêt.",
    };
  }
  if (baseLocale.value === "ru") {
    return {
      kicker: "Сравнение",
      title: "Сравнения чатов",
      description:
        "Изучайте сравнения чатов, которые помогают выбрать формат, подходящий именно вам.",
      intro:
        "Сравнивайте разные форматы анонимного чата, онлайн-чата и языковой практики в чате, чтобы понять, что подходит вам лучше всего, и начать уверенно.",
      supportText:
        "Понятные сравнения бок о бок, которые помогают увидеть различия и выбрать подходящий для вас путь.",
      browseLabel: "Смотреть сравнения",
      summaryTitle: (count) => `${count} сравнений, которые помогут вам выбрать`,
      siblingHubs: [
        { label: "Смотреть гайды", href: "/guides" },
        { label: "Смотреть темы", href: "/topics" },
      ],
      metaTitle: "Сравнение анонимных чатов | ImChatty",
      metaDescription:
        "Страницы сравнений для анонимного чата, текстового формата и альтернатив, которые пользователи ищут перед началом общения.",
      metaOgDescription:
        "Изучайте страницы сравнений и переходите в чат, когда будете готовы.",
    };
  }
  if (baseLocale.value === "zh") {
    return {
      kicker: "对比",
      title: "聊天对比",
      description:
        "浏览聊天对比内容，帮助你判断哪种形式更适合自己。",
      intro:
        "比较不同类型的匿名聊天、在线聊天和语言练习聊天，看看哪一种最适合你，并更有把握地开始。",
      supportText:
        "清晰的并列对比，帮助你看懂差异，并选出更适合自己的方向。",
      browseLabel: "浏览对比",
      summaryTitle: (count) => `${count} 个对比内容，帮你做出选择`,
      siblingHubs: [
        { label: "查看指南", href: "/guides" },
        { label: "查看主题", href: "/topics" },
      ],
      metaTitle: "比较匿名聊天选项 | ImChatty",
      metaDescription:
        "用于匿名聊天、文本优先聊天及相关替代方案的对比页面，帮助用户在进入聊天前做出判断。",
      metaOgDescription:
        "浏览以搜索意图为导向的对比页面，并在准备好时进入聊天。",
    };
  }
  return {
    kicker: "Compare",
    title: "Chat comparisons",
    description:
      "Browse chat comparisons built to help people choose the format that fits them best.",
    intro:
      "Compare different kinds of anonymous chat, online chat, and language practice chat so you can see what fits you best and start with confidence.",
    supportText:
      "Clear side-by-side comparisons to help you understand differences and choose the right path for you.",
    browseLabel: "Browse comparisons",
    summaryTitle: (count) => `${count} comparisons to help you choose`,
    siblingHubs: [
      { label: "Browse guides", href: "/guides" },
      { label: "Browse topics", href: "/topics" },
    ],
    metaTitle: "Compare Anonymous Chat Options | ImChatty",
    metaDescription:
      "Comparison pages for anonymous chat, text-first chat, and alternatives users search for before joining.",
    metaOgDescription:
      "Browse search-focused comparison pages and jump into chat when you're ready.",
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
