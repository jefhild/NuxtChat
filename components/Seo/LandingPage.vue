<template>
  <v-container
    fluid
    :class="['seo-page-shell', { 'seo-page-shell--dark': isDarkTheme }]"
  >
    <div class="seo-hero">
      <div class="seo-hero__copy">
        <v-chip size="small" variant="tonal" color="primary" class="mb-4">
          {{ sectionLabel }}
        </v-chip>
        <h1 class="text-h3 font-weight-bold mb-3">
          {{ page.heroTitle || page.title }}
        </h1>
        <p v-if="page.heroBody || page.subtitle" class="text-body-1 text-medium-emphasis mb-6">
          {{ page.heroBody || page.subtitle }}
        </p>
        <div class="d-flex flex-wrap ga-3">
          <v-btn color="primary" size="large" :to="localPath(page.ctaHref || '/chat')">
            {{ page.ctaLabel || "Start chatting" }}
          </v-btn>
          <v-btn variant="outlined" size="large" :to="localPath('/faq')">
            Learn more
          </v-btn>
        </div>
      </div>

      <v-sheet
        v-if="page.heroImageUrl || page.highlights?.length"
        class="seo-hero__panel pa-4 pa-md-5"
        rounded="xl"
        elevation="0"
      >
        <div v-if="page.heroImageUrl" class="seo-hero__image-wrap mb-4">
          <v-img
            :src="page.heroImageUrl"
            :alt="page.heroTitle || page.title"
            class="seo-hero__image"
            aspect-ratio="16/10"
            cover
          />
          <div v-if="showLanguageMenu" class="seo-hero__overlay">
            <v-menu content-class="article-language-menu">
              <template #activator="{ props: menuProps }">
                <v-btn
                  v-bind="menuProps"
                  size="x-small"
                  variant="flat"
                  class="language-menu-btn"
                  :title="originalLanguageTitle"
                >
                  <v-icon size="16">mdi-translate</v-icon>
                </v-btn>
              </template>
              <v-list density="compact">
                <v-list-item
                  v-for="localeOption in availableLocales"
                  :key="localeOption"
                  @click="selectLocale(localeOption)"
                >
                  <v-list-item-title>
                    {{ formatLocaleLabel(localeOption) }}
                  </v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
        </div>
        <div class="text-overline mb-3">Why this page exists</div>
        <ul v-if="page.highlights?.length" class="seo-highlights">
          <li v-for="highlight in page.highlights" :key="highlight">
            {{ highlight }}
          </li>
        </ul>
      </v-sheet>
    </div>

    <v-row class="mt-2">
      <v-col cols="12" md="8">
        <v-card
          :class="['pa-5 pa-md-8', { 'seo-card--dark': isDarkTheme }]"
          rounded="xl"
          elevation="0"
        >
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="seo-richtext"
            v-html="renderedBody"
          />
          <!-- eslint-enable vue/no-v-html -->
        </v-card>
      </v-col>

      <v-col cols="12" md="4" class="d-flex flex-column ga-4">
        <v-card
          v-if="page.relatedLinks?.length"
          :class="['pa-4', { 'seo-card--dark': isDarkTheme }]"
          rounded="xl"
          elevation="0"
        >
          <div class="text-h6 mb-3">Related pages</div>
          <div class="d-flex flex-column ga-2">
            <NuxtLink
              v-for="link in page.relatedLinks"
              :key="`${link.label}-${link.href}`"
              :to="localizeHref(link.href)"
              class="seo-related-link"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </v-card>

        <v-card
          :class="['pa-4', { 'seo-card--dark': isDarkTheme }]"
          rounded="xl"
          elevation="0"
        >
          <div class="text-h6 mb-3">Go to chat</div>
          <p class="text-body-2 text-medium-emphasis mb-4">
            These pages explain the option. The product action still happens inside ImChatty chat.
          </p>
          <v-btn block color="primary" size="large" :to="localPath(page.ctaHref || '/chat')">
            {{ page.ctaLabel || "Start chatting" }}
          </v-btn>
        </v-card>
      </v-col>
    </v-row>

    <v-card
      v-if="page.faqs?.length"
      :class="['pa-5 pa-md-8 mt-6', { 'seo-card--dark': isDarkTheme }]"
      rounded="xl"
      elevation="0"
    >
      <div class="text-h5 mb-4">FAQ</div>
      <v-expansion-panels variant="accordion">
        <v-expansion-panel
          v-for="faq in page.faqs"
          :key="faq.question"
          rounded="lg"
        >
          <v-expansion-panel-title>
            {{ faq.question }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="seo-faq-answer" v-html="renderMarkdown(faq.answer)" />
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card>
  </v-container>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import { sanitize } from "isomorphic-dompurify";
import { useTheme } from "vuetify";

type SeoLink = {
  label: string;
  href: string;
};

type SeoFaq = {
  question: string;
  answer: string;
};

type SeoPage = {
  title: string;
  subtitle?: string;
  heroTitle?: string;
  heroBody?: string;
  heroImageUrl?: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
  highlights?: string[];
  faqs?: SeoFaq[];
  relatedLinks?: SeoLink[];
};

const props = defineProps<{
  page: SeoPage;
  sectionLabel: string;
  availableLocales?: string[];
  currentLocale?: string;
}>();

const localPath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.current.value.dark);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const renderMarkdown = (value?: string) =>
  sanitize(md.render(String(value || "")), {
    ALLOWED_TAGS: [
      "p",
      "br",
      "hr",
      "em",
      "strong",
      "a",
      "ul",
      "ol",
      "li",
      "code",
      "pre",
      "blockquote",
      "h2",
      "h3",
      "h4",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });

const renderedBody = computed(() => renderMarkdown(props.page.body || ""));
const normalizedCurrentLocale = computed(() =>
  String(props.currentLocale || "en")
    .split("-")[0]
    .trim()
    .toLowerCase()
);
const availableLocales = computed(() => {
  const seen = new Set<string>();
  return (Array.isArray(props.availableLocales) ? props.availableLocales : [])
    .map((value) =>
      String(value || "")
        .split("-")[0]
        .trim()
        .toLowerCase()
    )
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    });
});
const showLanguageMenu = computed(() => availableLocales.value.length > 1);
const originalLanguageTitle = computed(() =>
  `Available languages: ${availableLocales.value.map(formatLocaleLabel).join(", ")}`
);

const localizeHref = (href: string) => {
  if (/^(https?:)?\/\//i.test(href) || href.startsWith("mailto:")) {
    return href;
  }
  return localPath(href.startsWith("/") ? href : `/${href}`);
};

const formatLocaleLabel = (localeCode: string) => {
  const normalized = String(localeCode || "")
    .split("-")[0]
    .trim()
    .toLowerCase();
  if (normalized === "fr") return "French";
  if (normalized === "ru") return "Russian";
  if (normalized === "zh") return "Chinese";
  return "English";
};

const selectLocale = (localeCode: string) => {
  const normalized = String(localeCode || "")
    .split("-")[0]
    .trim()
    .toLowerCase();
  if (!normalized || normalized === normalizedCurrentLocale.value) return;
  const next = switchLocalePath(normalized);
  if (next) navigateTo(next);
};
</script>

<style scoped>
.seo-page-shell {
  padding: 12px 10px 32px;
}

.seo-page-shell--dark {
  color: #e2e8f0;
}

.seo-hero {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
  align-items: stretch;
  margin-bottom: 12px;
}

.seo-hero__copy,
.seo-hero__panel {
  background:
    linear-gradient(140deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 251, 0.96));
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 28px;
}

.seo-hero__copy {
  padding: 32px;
}

.seo-page-shell--dark .seo-hero__copy,
.seo-page-shell--dark .seo-hero__panel,
.seo-card--dark {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
}

.seo-page-shell--dark :deep(.text-medium-emphasis),
.seo-page-shell--dark :deep(.text-body-2),
.seo-page-shell--dark :deep(.text-body-1) {
  color: #cbd5e1 !important;
}

.seo-page-shell--dark :deep(.v-expansion-panel) {
  background: rgba(15, 23, 42, 0.72);
  color: #e2e8f0;
}

.seo-highlights {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 10px;
}

.seo-hero__image-wrap {
  position: relative;
}

.seo-hero__overlay {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 2;
}

.seo-hero__image {
  border-radius: 20px;
  overflow: hidden;
}

.seo-richtext :deep(h2) {
  margin-top: 1.8rem;
  margin-bottom: 0.7rem;
}

.seo-richtext :deep(p),
.seo-faq-answer :deep(p) {
  line-height: 1.7;
}

.seo-related-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
  font-weight: 600;
}

.seo-page-shell--dark .seo-richtext :deep(a),
.seo-page-shell--dark .seo-related-link {
  color: #7dd3fc;
}

.seo-related-link:hover {
  text-decoration: underline;
}

@media (max-width: 959px) {
  .seo-hero {
    grid-template-columns: 1fr;
  }

  .seo-hero__copy {
    padding: 24px;
  }
}
</style>
