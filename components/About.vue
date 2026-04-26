<template>
  <div class="about-content">
    <div
      v-if="errorMessage"
      class="about-alert"
      role="status"
    >
      {{ errorMessage }}
    </div>

    <section
      v-for="section in resolvedSections"
      :key="section.key"
      class="about-section"
    >
      <h4 class="about-section-title">
        {{ section.title }}
      </h4>
      <!-- eslint-disable vue/no-v-html -->
      <div class="about-section-body" v-html="renderMarkdown(section.body)" />
      <!-- eslint-enable vue/no-v-html -->
    </section>
  </div>
</template>

<script setup lang="ts">
import MarkdownIt from "markdown-it";
import DOMPurify from "isomorphic-dompurify";
import { ABOUT_SECTION_DEFINITIONS } from "@/utils/aboutPageSections";

const { t, locale } = useI18n();

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
});

const repoUrl = "https://github.com/jefhild/NuxtChat";
const errorMessage = ref("");

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

const fallbackSections = computed(() =>
  ABOUT_SECTION_DEFINITIONS.map((section) => {
    const title = t(section.titleKey);
    let body = section.bodyKey ? t(section.bodyKey) : "";

    if (section.key === "who_we_are") {
      body = `${t("pages.about.page.who_we_are-text1")} [${t("pages.about.page.who_we_are-text3")}](${repoUrl}).`;
    }

    return {
      key: section.key,
      title,
      body,
    };
  })
);

const { data, error } = await useAsyncData(
  () => `about-sections:${locale.value}`,
  async () => {
    const response = await $fetch("/api/about/sections", {
      query: { locale: locale.value },
    });
    return response;
  },
  {
    watch: [() => locale.value],
  }
);

watch(
  () => error.value,
  (nextError) => {
    errorMessage.value = nextError ? "About content could not be loaded. Showing fallback copy." : "";
  },
  { immediate: true }
);

const resolvedSections = computed(() => {
  const overrides = new Map(
    (data.value?.sections || []).map((section: any) => [section.key, section])
  );

  return fallbackSections.value.map((fallback) => {
    const override = overrides.get(fallback.key);
    return {
      key: fallback.key,
      title: String(override?.title || "").trim() || fallback.title,
      body: String(override?.body || "").trim() || fallback.body,
    };
  });
});
</script>

<style scoped>
.about-content {
  margin-top: 0.75rem;
}

.about-alert {
  margin-bottom: 1rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgb(245 158 11 / 0.28);
  border-radius: 16px;
  background: rgb(245 158 11 / 0.12);
  color: rgb(var(--color-foreground) / 0.82);
}

.about-section {
  margin-bottom: 1.25rem;
}

.about-section:last-child {
  margin-bottom: 0;
}

.about-section-title {
  margin: 0 0 6px;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(var(--color-foreground) / 0.58);
}

.about-section-body {
  font-size: 0.95rem;
  line-height: 1.65;
  color: rgb(var(--color-foreground) / 0.8);
}

.about-section-body :deep(p) {
  margin-bottom: 12px;
}

.about-section-body :deep(p:last-child) {
  margin-bottom: 0;
}

.about-section-body :deep(a) {
  color: rgb(var(--color-primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>
