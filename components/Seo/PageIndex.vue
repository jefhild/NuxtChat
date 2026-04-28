<template>
  <section
    :class="[
      'seo-index-shell mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8',
      { 'seo-index-shell--dark': isDarkTheme },
    ]"
  >
    <div class="seo-index-header-shell">
      <PageHeader :text="title" :subtitle="description" />
    </div>

    <div class="seo-index-hero">
      <div class="seo-index-hero__copy">
        <span class="seo-index-chip seo-index-chip--primary type-eyebrow mb-3">
          {{ kicker }}
        </span>
        <p class="mb-5 text-base text-foreground/70">
          {{ intro }}
        </p>
        <div class="flex flex-wrap gap-3">
          <NuxtLink :to="localPath('/chat')" class="seo-index-btn seo-index-btn--primary">
            {{ uiCopy.startChatting }}
          </NuxtLink>
          <NuxtLink :to="localPath('/faq')" class="seo-index-btn seo-index-btn--secondary">
            {{ uiCopy.readFaq }}
          </NuxtLink>
        </div>
      </div>

      <div :class="['seo-index-summary p-5', { 'seo-index-card--dark': isDarkTheme }]">
        <div class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-foreground/65">
          {{ uiCopy.sectionOverview }}
        </div>
        <div class="type-section-title seo-index-summary-title mb-2 text-foreground">{{ summaryTitle(pages.length) }}</div>
        <p class="mb-4 text-sm text-foreground/70">
          {{ uiCopy.supportText }}
        </p>
        <div class="flex flex-col gap-2">
          <NuxtLink
            v-for="hub in siblingHubs"
            :key="hub.href"
            :to="localPath(hub.href)"
            class="seo-index-sibling"
          >
            {{ hub.label }}
          </NuxtLink>
        </div>
      </div>
    </div>

    <div class="mb-3 mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-foreground/65">
      {{ uiCopy.browsePages }}
    </div>
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div v-for="page in pages" :key="`${page.locale}-${page.slug}`">
        <NuxtLink :to="localPath(page.path)" class="seo-index-page-link">
          <div :class="['seo-index-page-card h-full p-4', { 'seo-index-card--dark': isDarkTheme }]">
            <div class="seo-index-page-card__top mb-3">
              <div class="seo-index-page-card__meta">
                <div class="mb-2 flex flex-wrap items-center gap-2">
                  <span class="seo-index-chip seo-index-chip--primary seo-index-chip--small type-eyebrow">
                    {{ kicker }}
                  </span>
                  <span class="seo-index-chip seo-index-chip--outline seo-index-chip--small seo-index-locale-chip type-eyebrow">
                    {{ formatLocaleShort(page.locale) }}
                  </span>
                </div>
                <div class="type-card-title mb-2 text-foreground">{{ page.title }}</div>
              </div>
              <div
                v-if="page.heroImageUrl"
                class="seo-index-page-card__thumb"
              >
                <div class="seo-index-page-card__thumb-image-wrap">
                  <img
                    :src="page.heroImageUrl"
                    :alt="page.title"
                    class="seo-index-page-card__thumb-image"
                  >
                  <div class="seo-index-page-card__image-overlay" />
                </div>
              </div>
            </div>
            <p class="mb-0 text-sm text-foreground/70">
              {{ page.subtitle || page.metaDescription || page.heroBody || uiCopy.explorePage }}
            </p>
          </div>
        </NuxtLink>
      </div>

      <div v-if="!pages.length">
        <div class="seo-index-empty-state" role="status">
          {{ uiCopy.noPages }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
type SeoIndexPage = {
  locale: string;
  slug: string;
  path: string;
  title: string;
  subtitle?: string;
  metaDescription?: string;
  heroBody?: string;
  heroImageUrl?: string;
};

const props = defineProps<{
  title: string;
  description: string;
  kicker: string;
  intro: string;
  siblingHubs: { label: string; href: string }[];
  pages: SeoIndexPage[];
  summaryTitleFormatter?: (count: number) => string;
}>();

const localPath = useLocalePath();
const { locale } = useI18n();
const { resolvedTheme } = useAppTheme();
const isDarkTheme = computed(() => resolvedTheme.value === "dark");
const currentLocale = computed(() =>
  String(locale.value || "en")
    .split("-")[0]
    .trim()
    .toLowerCase()
);

const copyByLocale: Record<
  string,
  {
    startChatting: string;
    readFaq: string;
    sectionOverview: string;
    publishedPages: (count: number) => string;
    supportText: string;
    browsePages: string;
    openPage: string;
    explorePage: string;
    noPages: string;
  }
> = {
  fr: {
    startChatting: "Commencer à discuter",
    readFaq: "Lire la FAQ",
    sectionOverview: "Aperçu de la section",
    publishedPages: (count) => `${count} pages publiées`,
    supportText:
      "Chaque page doit répondre à une question différente pour aider les visiteurs à comparer les options, approfondir le sujet et choisir la suite.",
    browsePages: "Parcourir les pages",
    openPage: "Ouvrir la page",
    explorePage: "Explorer cette page.",
    noPages: "Aucune page publiée pour cette section pour le moment.",
  },
  ru: {
    startChatting: "Начать чат",
    readFaq: "Читать FAQ",
    sectionOverview: "Обзор раздела",
    publishedPages: (count) => `Опубликовано страниц: ${count}`,
    supportText:
      "Каждая страница должна отвечать на отдельный вопрос, чтобы посетителям было проще сравнить варианты, разобраться глубже и выбрать следующий шаг.",
    browsePages: "Просмотреть страницы",
    openPage: "Открыть страницу",
    explorePage: "Изучите эту страницу.",
    noPages: "В этом разделе пока нет опубликованных страниц.",
  },
  zh: {
    startChatting: "开始聊天",
    readFaq: "查看常见问题",
    sectionOverview: "版块概览",
    publishedPages: (count) => `已发布页面：${count}`,
    supportText: "每个页面都应回答不同的问题，帮助访客比较选项、继续深入了解，并找到更清晰的下一步。",
    browsePages: "浏览页面",
    openPage: "打开页面",
    explorePage: "查看此页面。",
    noPages: "此版块暂时还没有已发布页面。",
  },
  en: {
    startChatting: "Start chatting",
    readFaq: "Read FAQ",
    sectionOverview: "Section overview",
    publishedPages: (count) => `${count} published pages`,
    supportText:
      "Here we answer different questions so you can compare options, go deeper, and choose a step that works for you.",
    browsePages: "Browse pages",
    openPage: "Open page",
    explorePage: "Explore this page.",
    noPages: "No published pages yet for this section.",
  },
};

const uiCopy = computed(
  () => copyByLocale[currentLocale.value] || copyByLocale.en
);
const summaryTitle = (count: number) =>
  props.summaryTitleFormatter?.(count) || uiCopy.value.publishedPages(count);

const formatLocaleLabel = (localeCode: string) => {
  const normalized = String(localeCode || "")
    .split("-")[0]
    .trim()
    .toLowerCase();
  if (currentLocale.value === "fr") {
    if (normalized === "fr") return "Français";
    if (normalized === "ru") return "Russe";
    if (normalized === "zh") return "Chinois";
    return "Anglais";
  }
  if (currentLocale.value === "ru") {
    if (normalized === "fr") return "Французский";
    if (normalized === "ru") return "Русский";
    if (normalized === "zh") return "Китайский";
    return "Английский";
  }
  if (currentLocale.value === "zh") {
    if (normalized === "fr") return "法语";
    if (normalized === "ru") return "俄语";
    if (normalized === "zh") return "中文";
    return "英语";
  }
  if (normalized === "fr") return "French";
  if (normalized === "ru") return "Russian";
  if (normalized === "zh") return "Chinese";
  return "English";
};

const formatLocaleShort = (localeCode: string) =>
  String(localeCode || "")
    .split("-")[0]
    .trim()
    .toUpperCase() || "EN";
</script>

<style scoped>
.seo-index-shell {
  padding: 12px 10px 32px;
}

.seo-index-shell--dark {
  color: #e2e8f0;
}

.seo-index-btn {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.75rem 1.25rem;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1;
  text-decoration: none;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease,
    box-shadow 160ms ease;
}

.seo-index-btn:hover,
.seo-index-btn:focus-visible {
  transform: translateY(-1px);
}

.seo-index-btn:focus-visible {
  outline: 2px solid rgb(var(--color-primary) / 0.45);
  outline-offset: 2px;
}

.seo-index-btn--primary {
  background: rgb(var(--color-primary));
  border: 1px solid rgb(var(--color-primary));
  color: #fff;
  box-shadow: 0 10px 22px rgb(var(--color-primary) / 0.2);
}

.seo-index-btn--primary:hover,
.seo-index-btn--primary:focus-visible {
  background: rgb(var(--color-primary) / 0.92);
}

.seo-index-btn--secondary {
  border: 1px solid rgb(var(--color-primary) / 0.26);
  background: transparent;
  color: rgb(var(--color-primary));
}

.seo-index-btn--secondary:hover,
.seo-index-btn--secondary:focus-visible {
  background: rgb(var(--color-primary) / 0.08);
}

.seo-index-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0.42rem 0.8rem;
  line-height: 1;
}

.seo-index-chip--small {
  padding: 0.28rem 0.6rem;
  font-size: 0.67rem;
}

.seo-index-summary-title {
  font-size: clamp(1.45rem, 1.2vw + 1.15rem, 1.95rem);
}

.seo-index-chip--primary {
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary));
}

.seo-index-chip--outline {
  border: 1px solid rgb(var(--color-border) / 0.8);
  background: transparent;
  color: rgb(var(--color-muted));
}

.seo-index-header-shell {
  margin-bottom: 18px;
}

.seo-index-hero {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
  align-items: stretch;
  margin-bottom: 10px;
}

.seo-index-hero__copy,
.seo-index-summary,
.seo-index-page-card {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(244, 247, 251, 0.94));
  border: 1px solid rgba(15, 23, 42, 0.08);
}

.seo-index-hero__copy {
  border-radius: 28px;
  padding: 28px;
}

.seo-index-shell--dark .seo-index-hero__copy,
.seo-index-shell--dark .seo-index-summary,
.seo-index-card--dark {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
}

.seo-index-sibling {
  color: rgb(var(--color-primary));
  text-decoration: none;
  font-weight: 600;
}

.seo-index-page-link {
  display: block;
  text-decoration: none;
  color: inherit;
  height: 100%;
}

.seo-index-shell--dark .seo-index-sibling {
  color: #7dd3fc;
}

.seo-index-sibling:hover {
  text-decoration: underline;
}

.seo-index-locale-chip {
  border-color: rgba(148, 163, 184, 0.24);
  color: rgba(148, 163, 184, 0.92);
}

.seo-index-page-card {
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease;
}

.seo-index-page-card__top {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
}

.seo-index-page-card__meta {
  min-width: 0;
  flex: 1 1 auto;
}

.seo-index-page-card__thumb {
  width: 84px;
  min-width: 84px;
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.seo-index-page-card__thumb-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: rgba(15, 23, 42, 0.12);
}

.seo-index-page-card__thumb-image-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}

.seo-index-page-card__image-overlay {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.04), rgba(15, 23, 42, 0.16));
}

.seo-index-page-link:hover .seo-index-page-card,
.seo-index-page-link:focus-visible .seo-index-page-card {
  transform: translateY(-2px);
  border-color: rgba(59, 130, 246, 0.26);
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.12);
}

.seo-index-shell--dark .seo-index-page-link:hover .seo-index-page-card,
.seo-index-shell--dark .seo-index-page-link:focus-visible .seo-index-page-card {
  border-color: rgba(125, 211, 252, 0.32);
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.32);
}

.seo-index-shell--dark .seo-index-page-card__media {
  border-color: rgba(148, 163, 184, 0.18);
}

.seo-index-shell--dark .seo-index-page-card__thumb {
  border-color: rgba(148, 163, 184, 0.18);
}

.seo-index-shell--dark .seo-index-locale-chip {
  border-color: rgba(148, 163, 184, 0.22);
  color: #cbd5e1;
}

.seo-index-shell--dark .seo-index-page-card__image-overlay {
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.28));
}

.seo-index-page-link:focus-visible {
  outline: none;
}

.seo-index-empty-state {
  border-radius: 18px;
  border: 1px solid rgb(59 130 246 / 0.18);
  background: rgb(59 130 246 / 0.1);
  padding: 1rem 1.1rem;
  color: rgb(30 64 175);
}

.seo-index-shell--dark .seo-index-empty-state {
  border-color: rgb(125 211 252 / 0.22);
  background: rgb(14 116 144 / 0.18);
  color: #dbeafe;
}

@media (max-width: 959px) {
  .seo-index-hero {
    grid-template-columns: 1fr;
  }

  .seo-index-page-card__thumb {
    width: 72px;
    min-width: 72px;
  }
}
</style>
