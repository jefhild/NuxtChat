<template>
  <v-container
    fluid
    :class="['seo-page-shell', { 'seo-page-shell--dark': isDarkTheme }]"
  >
    <div class="seo-layout">
      <div class="seo-main-stack">
        <div class="seo-hero__copy">
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
              {{ t("pages.home.landing_page.learn_more") }}
            </v-btn>
          </div>
        </div>

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
      </div>

      <div class="seo-side-stack">
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
            <div
              v-if="renderedPhotoCredits"
              class="seo-hero__photo-credit"
              v-html="renderedPhotoCredits"
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
          <div class="text-overline mb-3">{{ t("pages.seo.highlightsTitle") }}</div>
          <ul v-if="page.highlights?.length" class="seo-highlights">
            <li v-for="highlight in page.highlights" :key="highlight">
              {{ highlight }}
            </li>
          </ul>
        </v-sheet>

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
          v-if="page.faqs?.length"
          :class="['seo-faq-card pa-3 pa-md-4', { 'seo-card--dark': isDarkTheme }]"
          rounded="xl"
          elevation="0"
        >
          <div class="text-h5 mb-3">FAQ</div>
          <v-expansion-panels variant="accordion" class="seo-faq-panels">
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

        <v-card
          :class="['pa-4', { 'seo-card--dark': isDarkTheme }]"
          rounded="xl"
          elevation="0"
        >
          <div class="text-overline mb-2">{{ ctaCardCopy.eyebrow }}</div>
          <div class="text-h6 mb-3">{{ ctaCardCopy.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ ctaCardCopy.body }}
          </p>
          <div class="seo-cta-points mb-4">
            <div
              v-for="point in ctaCardCopy.points"
              :key="point"
              class="seo-cta-point"
            >
              <v-icon size="16" color="primary">mdi-check-circle-outline</v-icon>
              <span>{{ point }}</span>
            </div>
          </div>
          <v-btn block color="primary" size="large" :to="localPath(page.ctaHref || '/chat')">
            {{ page.ctaLabel || ctaCardCopy.button }}
          </v-btn>
        </v-card>
      </div>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";
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
  metaTitle?: string;
  metaDescription?: string;
  heroTitle?: string;
  heroBody?: string;
  heroImageUrl?: string;
  photoCreditsUrl?: string;
  photoCreditsHtml?: string;
  body?: string;
  ctaHref?: string;
  ctaLabel?: string;
  highlights?: string[];
  faqs?: SeoFaq[];
  relatedLinks?: SeoLink[];
  createdAt?: string;
  updatedAt?: string;
  path?: string;
};

const props = defineProps<{
  page: SeoPage;
  sectionLabel: string;
  availableLocales?: string[];
  currentLocale?: string;
}>();

const { t } = useI18n();
const localPath = useLocalePath();
const switchLocalePath = useSwitchLocalePath();
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.current.value.dark);

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens: Parameters<typeof md.renderer.renderToken>[0], idx: number, opts: Parameters<typeof md.renderer.renderToken>[2], _env: unknown, self: typeof md.renderer) =>
    self.renderToken(tokens, idx, opts));
md.renderer.rules.link_open = (tokens, idx, opts, env, self) => {
  const hrefIdx = tokens[idx].attrIndex("href");
  const href = hrefIdx >= 0 ? tokens[idx].attrs![hrefIdx][1] : "";
  const isExternal =
    /^https?:\/\//i.test(href) ||
    /^\/\//.test(href) ||
    /^mailto:/i.test(href) ||
    /^tel:/i.test(href);
  const tIdx = tokens[idx].attrIndex("target");
  const targetValue = isExternal ? "_blank" : "_self";
  if (tIdx < 0) tokens[idx].attrPush(["target", targetValue]);
  else tokens[idx].attrs![tIdx][1] = targetValue;
  if (isExternal) tokens[idx].attrPush(["rel", "noopener noreferrer"]);
  return defaultLinkOpen(tokens, idx, opts, env, self);
};

const normalizeMarkdown = (value?: string) =>
  String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00A0/g, " ")
    .replace(/^((?:#\s+){1,5}#)(?=\s)/gm, (match) => match.replace(/\s+/g, ""))
    .replace(/^[ \t]+(?=#{1,6}\s)/gm, "")
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2");

const normalizeRenderedMarkdownHtml = (value: string) =>
  String(value || "").replace(
    /(^|\n)(#{1,6})\s+([^\n<][^\n]*)(?=\n<(?:p|ul|ol|blockquote|pre|hr|h[1-6])|$)/g,
    (_match, prefix, hashes, text) => {
      const level = Math.min(Math.max(String(hashes || "").length + 1, 2), 4);
      return `${prefix}<h${level}>${String(text || "").trim()}</h${level}>`;
    }
  );

const renderMarkdown = (value?: string) =>
  DOMPurify.sanitize(normalizeRenderedMarkdownHtml(md.render(normalizeMarkdown(value))), {
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
const renderedPhotoCredits = computed(() =>
  DOMPurify.sanitize(String(props.page.photoCreditsHtml || ""), {
    ALLOWED_TAGS: ["a", "span", "em", "strong", "br"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  })
);

const route = useRoute();
const webPageSchema = computed(() => {
  const canonicalUrl = `https://imchatty.com${props.page.path || route.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${canonicalUrl}#webpage`,
    url: canonicalUrl,
    name: props.page.metaTitle || props.page.title,
    description: props.page.metaDescription || props.page.subtitle || "",
    ...(props.page.heroImageUrl ? { image: props.page.heroImageUrl } : {}),
    ...(props.page.createdAt ? { datePublished: props.page.createdAt } : {}),
    ...(props.page.updatedAt ? { dateModified: props.page.updatedAt } : {}),
    isPartOf: { "@id": "https://imchatty.com/#website" },
    publisher: { "@id": "https://imchatty.com/#organization" },
  };
});
const faqSchema = computed(() => {
  const faqs = props.page.faqs;
  if (!faqs?.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
});
useHead(
  computed(() => ({
    script: [
      {
        type: "application/ld+json",
        innerHTML: JSON.stringify(webPageSchema.value),
        key: "webpage-schema",
      },
      ...(faqSchema.value
        ? [
            {
              type: "application/ld+json",
              innerHTML: JSON.stringify(faqSchema.value),
              key: "faq-schema",
            },
          ]
        : []),
    ],
  }))
);
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
const ctaCardCopy = computed(() => ({
  eyebrow: t("pages.seo.ctaCard.eyebrow"),
  title: t("pages.seo.ctaCard.title"),
  body: t("pages.seo.ctaCard.body"),
  button: t("pages.seo.ctaCard.button"),
  points: [
    t("pages.seo.ctaCard.points.0"),
    t("pages.seo.ctaCard.points.1"),
    t("pages.seo.ctaCard.points.2"),
  ],
}));
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

.seo-layout {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  gap: 20px;
  margin-bottom: 12px;
}

.seo-main-stack,
.seo-side-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
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

.seo-faq-card {
  overflow: hidden;
}

.seo-faq-panels {
  width: 100%;
}

.seo-faq-panels :deep(.v-expansion-panel) {
  margin-inline: 0;
}

.seo-faq-panels :deep(.v-expansion-panel-title),
.seo-faq-panels :deep(.v-expansion-panel-text__wrapper) {
  padding-left: 20px;
  padding-right: 20px;
}

.seo-cta-points {
  display: grid;
  gap: 10px;
}

.seo-cta-point {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #cbd5e1;
  font-size: 0.95rem;
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

.seo-hero__photo-credit {
  position: absolute;
  right: 12px;
  bottom: 12px;
  z-index: 2;
  max-width: calc(100% - 24px);
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.78);
  color: #fff;
  font-size: 0.8rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seo-hero__photo-credit :deep(a) {
  color: inherit;
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
  .seo-layout {
    grid-template-columns: 1fr;
  }

  .seo-hero__copy {
    padding: 24px;
  }
}
</style>
