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
        "Parcourez des comparaisons conçues pour aider chacun à choisir le format de chat qui lui convient le mieux.",
      intro:
        "Ces comparaisons sont là pour vous aider à trouver ce qui vous convient vraiment — pas seulement l'option la plus populaire. Parcourez les différences, voyez ce qui vous parle, et lancez-vous quand vous êtes prêt.",
      summaryTitle: (count) => `${count} pages pour vous aider à comparer`,
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
        "Изучайте сравнения, которые помогают выбрать формат чата, подходящий именно вам.",
      intro:
        "Эти сравнения помогут найти то, что подходит именно вам — а не просто самый популярный вариант. Просматривайте различия, выбирайте то, что откликается, и начинайте, когда будете готовы.",
      summaryTitle: (count) => `${count} страницы, чтобы помочь вам сравнить`,
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
        "浏览帮助用户判断哪种聊天形式更适合自己的对比页面。",
      intro:
        "这些对比页面帮助你找到真正适合自己的选择——而不只是最热门的那个。浏览差异，看看哪个更符合你的感觉，准备好了就直接开始。",
      summaryTitle: (count) => `${count} 个页面帮助你比较选择`,
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
      "Browse comparison pages built to help people choose the chat format that fits them best.",
    intro:
      "These comparisons are here to help you find what actually fits you — not just the most popular option. Browse the differences, see what feels right, and jump in when you're ready.",
    summaryTitle: (count) => `${count} pages to help you compare`,
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
