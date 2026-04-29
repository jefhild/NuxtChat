<template>
  <section class="seo-page-shell mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
    <div class="seo-layout">
      <div class="seo-main-stack">
        <div class="seo-hero__copy">
          <h1 class="mb-3 text-3xl font-semibold text-foreground md:text-4xl lg:text-5xl">
            {{ page.heroTitle || page.title }}
          </h1>
          <p v-if="page.heroBody || page.subtitle" class="mb-6 text-base text-foreground/70 md:text-lg">
            {{ page.heroBody || page.subtitle }}
          </p>
          <div class="flex flex-wrap gap-3">
            <NuxtLink :to="localPath(page.ctaHref || '/chat')" class="seo-btn seo-btn--primary">
              {{ page.ctaLabel || "Start chatting" }}
            </NuxtLink>
            <NuxtLink :to="learnMoreTo" class="seo-btn seo-btn--secondary">
              {{ t("pages.home.landing_page.learn_more") }}
            </NuxtLink>
          </div>
        </div>

        <div class="seo-card p-5 md:p-8">
          <!-- eslint-disable vue/no-v-html -->
          <div
            class="seo-richtext"
            v-html="renderedBody"
          />
          <!-- eslint-enable vue/no-v-html -->
        </div>
      </div>

      <div class="seo-side-stack">
        <div
          v-if="page.heroImageUrl || page.highlights?.length"
          class="seo-hero__panel p-4 md:p-5"
        >
          <div v-if="page.heroImageUrl" class="seo-hero__image-wrap mb-4">
            <div class="seo-hero__image">
              <img
                :src="page.heroImageUrl"
                :alt="page.heroTitle || page.title"
                class="seo-hero__image-el"
              >
            </div>
            <div
              v-if="renderedPhotoCredits"
              class="seo-hero__photo-credit"
              v-html="renderedPhotoCredits"
            />
            <div v-if="showLanguageMenu" class="seo-hero__overlay">
              <details class="seo-language-menu">
                <summary
                  class="language-menu-btn"
                  :title="originalLanguageTitle"
                  aria-label="Select article language"
                >
                  <i class="mdi mdi-translate text-base" aria-hidden="true" />
                </summary>
                <div class="seo-language-menu__panel" role="menu">
                  <button
                    v-for="localeOption in availableLocales"
                    :key="localeOption"
                    type="button"
                    class="seo-language-menu__item"
                    @click="selectLocale(localeOption)"
                  >
                    {{ formatLocaleLabel(localeOption) }}
                  </button>
                </div>
              </details>
            </div>
          </div>
          <div class="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-foreground/65">
            {{ t("pages.seo.highlightsTitle") }}
          </div>
          <ul v-if="page.highlights?.length" class="seo-highlights">
            <li v-for="highlight in page.highlights" :key="highlight">
              {{ highlight }}
            </li>
          </ul>
        </div>

        <div
          v-if="page.relatedLinks?.length"
          class="seo-card p-4"
        >
          <div class="mb-3 text-lg font-semibold text-foreground">Related pages</div>
          <div class="flex flex-col gap-2">
            <NuxtLink
              v-for="link in page.relatedLinks"
              :key="`${link.label}-${link.href}`"
              :to="localizeHref(link.href)"
              class="seo-related-link"
            >
              {{ link.label }}
            </NuxtLink>
          </div>
        </div>

        <div
          v-if="page.faqs?.length"
          class="seo-card seo-faq-card p-3 md:p-4"
        >
          <div class="mb-3 text-2xl font-semibold text-foreground">FAQ</div>
          <div class="seo-faq-panels">
            <details
              v-for="faq in page.faqs"
              :key="faq.question"
              class="seo-faq-item"
            >
              <summary class="seo-faq-item__summary">
                <span>{{ faq.question }}</span>
                <i class="mdi mdi-chevron-down seo-faq-item__chevron" aria-hidden="true" />
              </summary>
              <div class="seo-faq-item__content">
                <!-- eslint-disable-next-line vue/no-v-html -->
                <div class="seo-faq-answer" v-html="renderMarkdown(faq.answer)" />
              </div>
            </details>
          </div>
        </div>

        <div class="seo-card p-4">
          <div class="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-foreground/65">
            {{ ctaCardCopy.eyebrow }}
          </div>
          <div class="mb-3 text-lg font-semibold text-foreground">{{ ctaCardCopy.title }}</div>
          <p class="mb-4 text-sm text-foreground/70">
            {{ ctaCardCopy.body }}
          </p>
          <div class="seo-cta-points mb-4">
            <div
              v-for="point in ctaCardCopy.points"
              :key="point"
              class="seo-cta-point"
            >
              <i class="mdi mdi-check-circle-outline text-base text-primary" aria-hidden="true" />
              <span>{{ point }}</span>
            </div>
          </div>
          <NuxtLink :to="localPath(page.ctaHref || '/chat')" class="seo-btn seo-btn--primary seo-btn--block">
            {{ page.ctaLabel || ctaCardCopy.button }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";

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

const md = new MarkdownIt({
  html: true,
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
const languagePracticeLandingSlugs = new Set([
  "practice-english-chat-online",
  "practice-french-chat-online",
  "practice-russian-chat-online",
  "practice-chinese-chat-online",
]);
const routeSlug = computed(() =>
  String(route.path || "")
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase()
);
const learnMoreTo = computed(() => {
  if (routeSlug.value && languagePracticeLandingSlugs.has(routeSlug.value)) {
    return localPath({
      path: "/faq",
      query: { group: "language-practice" },
    });
  }
  return localPath("/faq");
});
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

:global(html.dark .seo-page-shell),
:global(html[data-imchatty-theme="dark"] .seo-page-shell) {
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
.seo-hero__panel,
.seo-card {
  background:
    linear-gradient(140deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 251, 0.96));
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 28px;
}

.seo-hero__copy {
  padding: 32px;
}

:global(html.dark .seo-hero__copy),
:global(html.dark .seo-hero__panel),
:global(html.dark .seo-card),
:global(html[data-imchatty-theme="dark"] .seo-hero__copy),
:global(html[data-imchatty-theme="dark"] .seo-hero__panel),
:global(html[data-imchatty-theme="dark"] .seo-card) {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
}

:global(html.dark .seo-cta-point),
:global(html[data-imchatty-theme="dark"] .seo-cta-point) {
  color: #cbd5e1;
}

.seo-faq-card {
  overflow: hidden;
}

.seo-btn {
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

.seo-btn:hover,
.seo-btn:focus-visible {
  transform: translateY(-1px);
}

.seo-btn:focus-visible {
  outline: 2px solid rgb(var(--color-primary) / 0.45);
  outline-offset: 2px;
}

.seo-btn--primary {
  background: rgb(var(--color-primary));
  border: 1px solid rgb(var(--color-primary));
  color: #fff;
  box-shadow: 0 10px 22px rgb(var(--color-primary) / 0.2);
}

.seo-btn--primary:hover,
.seo-btn--primary:focus-visible {
  background: rgb(var(--color-primary) / 0.92);
}

.seo-btn--secondary {
  border: 1px solid rgb(var(--color-primary) / 0.26);
  background: transparent;
  color: rgb(var(--color-primary));
}

.seo-btn--secondary:hover,
.seo-btn--secondary:focus-visible {
  background: rgb(var(--color-primary) / 0.08);
}

.seo-btn--block {
  display: flex;
  width: 100%;
}

.seo-faq-panels {
  width: 100%;
  display: grid;
  gap: 10px;
}

.seo-faq-item {
  overflow: hidden;
  border-radius: 18px;
  border: 1px solid rgb(148 163 184 / 0.18);
  background: rgb(255 255 255 / 0.46);
}

:global(html.dark .seo-faq-item),
:global(html[data-imchatty-theme="dark"] .seo-faq-item) {
  background: rgb(15 23 42 / 0.72);
  color: #e2e8f0;
}

.seo-faq-item__summary {
  display: flex;
  cursor: pointer;
  list-style: none;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  font-weight: 600;
}

.seo-faq-item__summary::-webkit-details-marker {
  display: none;
}

.seo-faq-item__chevron {
  transition: transform 160ms ease;
}

.seo-faq-item[open] .seo-faq-item__chevron {
  transform: rotate(180deg);
}

.seo-faq-item__content {
  padding: 0 20px 20px;
}

.seo-cta-points {
  display: grid;
  gap: 10px;
}

.seo-cta-point {
  display: flex;
  align-items: center;
  gap: 8px;
  color: rgb(var(--color-foreground) / 0.78);
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

.seo-language-menu {
  position: relative;
}

.seo-language-menu[open] .language-menu-btn {
  background: rgb(15 23 42 / 0.92);
  color: #fff;
}

.seo-language-menu__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 12;
  min-width: 180px;
  border-radius: 14px;
  border: 1px solid rgb(var(--color-border) / 0.85);
  background: rgb(var(--color-surface));
  padding: 0.35rem;
  box-shadow: 0 16px 36px rgb(var(--color-shadow) / 0.18);
}

:global(html.dark .seo-language-menu__panel),
:global(html[data-imchatty-theme="dark"] .seo-language-menu__panel) {
  background: rgb(15 23 42 / 0.98);
  border-color: rgb(148 163 184 / 0.22);
}

.seo-language-menu__item {
  display: flex;
  width: 100%;
  align-items: center;
  border: 0;
  background: transparent;
  border-radius: 10px;
  padding: 0.65rem 0.8rem;
  color: rgb(var(--color-foreground));
  font-size: 0.9rem;
  text-align: left;
}

:global(html.dark .seo-language-menu__item),
:global(html[data-imchatty-theme="dark"] .seo-language-menu__item) {
  color: #e2e8f0;
}

.seo-language-menu__item:hover,
.seo-language-menu__item:focus-visible {
  background: rgb(var(--color-primary) / 0.1);
  outline: none;
}

.seo-hero__image {
  border-radius: 20px;
  overflow: hidden;
  aspect-ratio: 16 / 10;
}

.seo-hero__image-el {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  color: rgb(var(--color-primary));
  text-decoration: none;
  font-weight: 600;
}

:global(html.dark .seo-richtext :deep(a)),
:global(html.dark .seo-related-link),
:global(html[data-imchatty-theme="dark"] .seo-richtext :deep(a)),
:global(html[data-imchatty-theme="dark"] .seo-related-link) {
  color: #7dd3fc;
}

.seo-related-link:hover {
  text-decoration: underline;
}

.language-menu-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgb(255 255 255 / 0.28);
  border-radius: 999px;
  background: rgb(15 23 42 / 0.78);
  color: #fff;
  cursor: pointer;
  list-style: none;
  box-shadow: 0 10px 20px rgb(2 6 23 / 0.2);
}

.language-menu-btn::-webkit-details-marker {
  display: none;
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
