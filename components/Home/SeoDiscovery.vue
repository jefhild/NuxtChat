<template>
  <section class="seo-discovery">
    <div class="seo-discovery__header">
      <div>
        <span class="seo-discovery-chip seo-discovery-chip--primary mb-3">
          {{ copy.kicker }}
        </span>
        <h2 class="mb-3 text-3xl font-semibold text-foreground md:text-4xl">
          {{ copy.title }}
        </h2>
        <p class="seo-discovery__intro text-base text-foreground/70">
          {{ copy.description }}
        </p>
      </div>
      <div class="seo-discovery__hub-links">
        <NuxtLink
          v-for="hub in hubs"
          :key="hub.href"
          :to="localPath(hub.href)"
          class="seo-discovery__hub-link"
        >
          {{ hub.label }}
        </NuxtLink>
      </div>
    </div>

    <div class="mt-2 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div v-for="card in featuredCards" :key="card.pageType">
        <NuxtLink
          v-if="card.page"
          :to="localPath(card.page.path)"
          class="seo-discovery__card-link"
        >
          <div class="seo-discovery__card h-full">
            <div class="seo-discovery__card-inner">
              <div class="mb-4 flex items-center justify-between gap-3">
                <span class="seo-discovery-chip seo-discovery-chip--primary">
                  {{ card.kicker }}
                </span>
                <span class="text-xs text-foreground/65">
                  {{ card.hubLabel }}
                </span>
              </div>

              <div class="mb-2 text-lg font-semibold text-foreground">
                {{ card.page.title }}
              </div>
              <p class="seo-discovery__card-copy mb-0 text-sm text-foreground/70">
                {{ card.page.subtitle || card.page.heroBody || card.emptyDescription }}
              </p>
            </div>
          </div>
        </NuxtLink>
        <div
          v-else
          class="seo-discovery__card h-full"
        >
          <div class="seo-discovery__card-inner">
            <div class="mb-4 flex items-center justify-between gap-3">
              <span class="seo-discovery-chip seo-discovery-chip--primary">
                {{ card.kicker }}
              </span>
              <span class="text-xs text-foreground/65">
                {{ card.hubLabel }}
              </span>
            </div>

            <div class="mb-2 text-lg font-semibold text-foreground">
              {{ card.emptyTitle }}
            </div>
            <p class="seo-discovery__card-copy mb-5 text-sm text-foreground/70">
              {{ card.emptyDescription }}
            </p>

            <div class="mt-auto flex flex-wrap gap-3">
              <NuxtLink :to="localPath(card.hubHref)" class="seo-discovery__text-link">
                {{ copy.browseHub }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";

type SeoPageSummary = {
  pageType: "compare" | "guide" | "topic";
  locale: string;
  slug: string;
  path: string;
  title: string;
  subtitle?: string;
  heroBody?: string;
};

type SeoApiResponse = {
  success?: boolean;
  pages?: SeoPageSummary[];
};

const localPath = useLocalePath();
const { locale } = useI18n();
const localeCode = computed(() =>
  String(locale.value || "en")
    .trim()
    .toLowerCase()
    .split("-")[0]
);

const copyByLocale = {
  en: {
    kicker: "Explore more",
    title: "Find the right way to start chatting",
    description:
      "Browse quick comparisons, practical guides, and evergreen topics before jumping into chat.",
    openPage: "Open page",
    browseHub: "Browse section",
    compare: "Compare",
    guide: "Guide",
    topic: "Topic",
    compareHub: "Chat comparisons",
    guideHub: "Chat guides",
    topicHub: "Chat topics",
    emptyCompareTitle: "Comparison pages coming next",
    emptyGuideTitle: "Guide pages coming next",
    emptyTopicTitle: "Topic pages coming next",
    emptyCompareDescription:
      "Use the compare section to see which chat experience fits your style and comfort level.",
    emptyGuideDescription:
      "Use the guides section for practical answers around privacy, signup friction, and getting started.",
    emptyTopicDescription:
      "Use the topics section to explore broader intents like meeting people online or making friends.",
  },
  fr: {
    kicker: "Explorer plus",
    title: "Trouvez la bonne façon de commencer à discuter",
    description:
      "Parcourez des comparaisons rapides, des guides pratiques et des sujets durables avant d’entrer dans le chat.",
    openPage: "Ouvrir la page",
    browseHub: "Parcourir la section",
    compare: "Comparaison",
    guide: "Guide",
    topic: "Sujet",
    compareHub: "Comparaisons de chat",
    guideHub: "Guides de chat",
    topicHub: "Sujets de chat",
    emptyCompareTitle: "Les pages de comparaison arrivent",
    emptyGuideTitle: "Les pages guide arrivent",
    emptyTopicTitle: "Les pages sujet arrivent",
    emptyCompareDescription:
      "La section comparaisons aide à voir quel style de chat correspond le mieux à vos attentes.",
    emptyGuideDescription:
      "La section guides répond aux questions pratiques sur la confidentialité, l’inscription et le démarrage.",
    emptyTopicDescription:
      "La section sujets couvre des intentions plus larges comme rencontrer des gens en ligne ou se faire des amis.",
  },
  ru: {
    kicker: "Изучить больше",
    title: "Найдите подходящий способ начать чат",
    description:
      "Посмотрите быстрые сравнения, практические гайды и основные темы перед тем, как перейти в чат.",
    openPage: "Открыть страницу",
    browseHub: "Открыть раздел",
    compare: "Сравнение",
    guide: "Гайд",
    topic: "Тема",
    compareHub: "Сравнения чатов",
    guideHub: "Гайды по чату",
    topicHub: "Темы чата",
    emptyCompareTitle: "Страницы сравнений скоро появятся",
    emptyGuideTitle: "Страницы гайдов скоро появятся",
    emptyTopicTitle: "Страницы тем скоро появятся",
    emptyCompareDescription:
      "Раздел сравнений помогает понять, какой формат чата больше подходит вам по стилю и комфорту.",
    emptyGuideDescription:
      "Раздел гайдов отвечает на практические вопросы о приватности, регистрации и старте.",
    emptyTopicDescription:
      "Раздел тем раскрывает более широкие запросы, например знакомство онлайн или поиск друзей.",
  },
  zh: {
    kicker: "继续探索",
    title: "找到适合你的聊天入口",
    description:
      "先看简短对比、实用指南和长期主题，再决定是否进入聊天。",
    openPage: "打开页面",
    browseHub: "浏览版块",
    compare: "对比",
    guide: "指南",
    topic: "主题",
    compareHub: "聊天对比",
    guideHub: "聊天指南",
    topicHub: "聊天主题",
    emptyCompareTitle: "对比页面即将推出",
    emptyGuideTitle: "指南页面即将推出",
    emptyTopicTitle: "主题页面即将推出",
    emptyCompareDescription:
      "对比版块帮助你判断哪种聊天方式更适合你的偏好和舒适度。",
    emptyGuideDescription:
      "指南版块回答隐私、注册门槛和开始使用等实际问题。",
    emptyTopicDescription:
      "主题版块覆盖更宽泛的需求，比如在线认识人或结交朋友。",
  },
} as const;

const copy = computed(
  () => copyByLocale[localeCode.value as keyof typeof copyByLocale] || copyByLocale.en
);

const { data } = await useAsyncData(
  "home-seo-discovery",
  async () => {
    const currentLocale = localeCode.value || "en";
    const [compare, guide, topic] = await Promise.all([
      $fetch<SeoApiResponse>("/api/seo-pages", {
        query: { type: "compare", locale: currentLocale, limit: 1 },
      }),
      $fetch<SeoApiResponse>("/api/seo-pages", {
        query: { type: "guide", locale: currentLocale, limit: 1 },
      }),
      $fetch<SeoApiResponse>("/api/seo-pages", {
        query: { type: "topic", locale: currentLocale, limit: 1 },
      }),
    ]);

    return {
      compare: Array.isArray(compare?.pages) ? compare.pages[0] || null : null,
      guide: Array.isArray(guide?.pages) ? guide.pages[0] || null : null,
      topic: Array.isArray(topic?.pages) ? topic.pages[0] || null : null,
    };
  },
  {
    default: () => ({
      compare: null,
      guide: null,
      topic: null,
    }),
    watch: [localeCode],
  }
);

const hubs = computed(() => [
  { href: "/compare", label: copy.value.compareHub },
  { href: "/guides", label: copy.value.guideHub },
  { href: "/topics", label: copy.value.topicHub },
]);

const featuredCards = computed(() => [
  {
    pageType: "compare",
    page: data.value?.compare || null,
    kicker: copy.value.compare,
    hubLabel: copy.value.compareHub,
    hubHref: "/compare",
    emptyTitle: copy.value.emptyCompareTitle,
    emptyDescription: copy.value.emptyCompareDescription,
  },
  {
    pageType: "guide",
    page: data.value?.guide || null,
    kicker: copy.value.guide,
    hubLabel: copy.value.guideHub,
    hubHref: "/guides",
    emptyTitle: copy.value.emptyGuideTitle,
    emptyDescription: copy.value.emptyGuideDescription,
  },
  {
    pageType: "topic",
    page: data.value?.topic || null,
    kicker: copy.value.topic,
    hubLabel: copy.value.topicHub,
    hubHref: "/topics",
    emptyTitle: copy.value.emptyTopicTitle,
    emptyDescription: copy.value.emptyTopicDescription,
  },
]);
</script>

<style scoped>
.seo-discovery {
  margin-top: 16px;
  padding: 20px;
  border-radius: 32px;
  background:
    radial-gradient(720px 240px at 0% 0%, rgba(14, 165, 233, 0.12), transparent 58%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
  border: 1px solid rgba(148, 163, 184, 0.18);
}

:global(.dark) .seo-discovery {
  background:
    radial-gradient(900px 320px at 0% 0%, rgba(56, 189, 248, 0.14), transparent 58%),
    linear-gradient(180deg, rgba(11, 18, 32, 0.98), rgba(15, 23, 42, 0.96));
  border-color: rgba(148, 163, 184, 0.2);
}

.seo-discovery-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.42rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.seo-discovery-chip--primary {
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary));
}

.seo-discovery__header {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: end;
  margin-bottom: 4px;
}

.seo-discovery__intro {
  max-width: 60ch;
}

.seo-discovery__hub-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: flex-end;
}

.seo-discovery__hub-link {
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  border: 1px solid rgb(var(--color-primary) / 0.26);
  padding: 0.75rem 1.1rem;
  color: rgb(var(--color-primary));
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.seo-discovery__hub-link:hover,
.seo-discovery__hub-link:focus-visible {
  transform: translateY(-1px);
  background: rgb(var(--color-primary) / 0.08);
}

.seo-discovery__hub-link:focus-visible {
  outline: 2px solid rgb(var(--color-primary) / 0.45);
  outline-offset: 2px;
}

.seo-discovery__card {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(244, 247, 251, 0.94));
  border: 1px solid rgba(15, 23, 42, 0.08);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

:global(.dark) .seo-discovery__card {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border-color: rgba(148, 163, 184, 0.18);
}

.seo-discovery__card-link {
  display: block;
  text-decoration: none;
  color: inherit;
  height: 100%;
}

.seo-discovery__card-link:hover .seo-discovery__card,
.seo-discovery__card-link:focus-visible .seo-discovery__card {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.26);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}

:global(.dark) .seo-discovery__card-link:hover .seo-discovery__card,
:global(.dark) .seo-discovery__card-link:focus-visible .seo-discovery__card {
  border-color: rgba(125, 211, 252, 0.32);
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.32);
}

.seo-discovery__card-link:focus-visible {
  outline: none;
}

.seo-discovery__card-inner {
  min-height: 232px;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.seo-discovery__card-copy {
  max-width: 40ch;
}

.seo-discovery__text-link {
  color: rgb(var(--color-primary));
  font-weight: 600;
  text-decoration: none;
}

.seo-discovery__text-link:hover,
.seo-discovery__text-link:focus-visible {
  text-decoration: underline;
}

@media (max-width: 959px) {
  .seo-discovery {
    padding: 16px;
    border-radius: 24px;
  }

  .seo-discovery__header {
    flex-direction: column;
    align-items: stretch;
  }

  .seo-discovery__hub-links {
    justify-content: flex-start;
  }
}
</style>
