<template>
  <v-container
    fluid
    :class="['seo-index-shell', { 'seo-index-shell--dark': isDarkTheme }]"
  >
    <div class="seo-index-header-shell">
      <PageHeader :text="title" :subtitle="description" />
    </div>

    <div class="seo-index-hero">
      <div class="seo-index-hero__copy">
        <v-chip size="small" variant="tonal" color="primary" class="mb-3">
          {{ kicker }}
        </v-chip>
        <p class="text-body-1 text-medium-emphasis mb-5">
          {{ intro }}
        </p>
        <div class="d-flex flex-wrap ga-3">
          <v-btn color="primary" size="large" :to="localPath('/chat')">
            {{ uiCopy.startChatting }}
          </v-btn>
          <v-btn variant="outlined" size="large" :to="localPath('/faq')">
            {{ uiCopy.readFaq }}
          </v-btn>
        </div>
      </div>

      <v-card
        :class="['seo-index-summary pa-5', { 'seo-index-card--dark': isDarkTheme }]"
        rounded="xl"
        elevation="0"
      >
        <div class="text-overline mb-3">{{ uiCopy.sectionOverview }}</div>
        <div class="text-h5 font-weight-bold mb-2">{{ summaryTitle(pages.length) }}</div>
        <p class="text-body-2 text-medium-emphasis mb-4">
          {{ uiCopy.supportText }}
        </p>
        <div class="d-flex flex-column ga-2">
          <NuxtLink
            v-for="hub in siblingHubs"
            :key="hub.href"
            :to="localPath(hub.href)"
            class="seo-index-sibling"
          >
            {{ hub.label }}
          </NuxtLink>
        </div>
      </v-card>
    </div>

    <div class="text-overline mb-3 mt-6">{{ uiCopy.browsePages }}</div>
    <v-row>
      <v-col v-for="page in pages" :key="`${page.locale}-${page.slug}`" cols="12" md="6">
        <NuxtLink :to="localPath(page.path)" class="seo-index-page-link">
          <v-card
            :class="['pa-4 h-100 seo-index-page-card', { 'seo-index-card--dark': isDarkTheme }]"
            rounded="xl"
            elevation="0"
          >
            <div class="seo-index-page-card__top mb-3">
              <div class="seo-index-page-card__meta">
                <div class="d-flex align-center ga-2 mb-2 flex-wrap">
                  <v-chip size="x-small" variant="tonal" color="primary">
                    {{ kicker }}
                  </v-chip>
                  <v-chip
                    size="x-small"
                    variant="outlined"
                    class="seo-index-locale-chip"
                  >
                    {{ formatLocaleShort(page.locale) }}
                  </v-chip>
                </div>
                <div class="text-h6 font-weight-bold mb-2">{{ page.title }}</div>
              </div>
              <div
                v-if="page.heroImageUrl"
                class="seo-index-page-card__thumb"
              >
                <v-img
                  :src="page.heroImageUrl"
                  :alt="page.title"
                  cover
                  class="seo-index-page-card__thumb-image"
                  aspect-ratio="1"
                >
                  <div class="seo-index-page-card__image-overlay" />
                </v-img>
              </div>
            </div>
            <p class="text-body-2 text-medium-emphasis mb-0">
              {{ page.subtitle || page.metaDescription || page.heroBody || uiCopy.explorePage }}
            </p>
          </v-card>
        </NuxtLink>
      </v-col>

      <v-col v-if="!pages.length" cols="12">
        <v-alert type="info" variant="tonal">
          {{ uiCopy.noPages }}
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useTheme } from "vuetify";

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
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.current.value.dark);
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
      "Each page should answer a different question so visitors can compare options, go deeper, and choose a clearer next step.",
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

.seo-index-shell--dark :deep(.text-medium-emphasis),
.seo-index-shell--dark :deep(.text-body-2),
.seo-index-shell--dark :deep(.text-body-1) {
  color: #cbd5e1 !important;
}

.seo-index-sibling {
  color: rgb(var(--v-theme-primary));
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
  background: rgba(15, 23, 42, 0.12);
}

.seo-index-page-card__image-overlay {
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
