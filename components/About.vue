<template>
  <v-container fluid class="pa-0 mt-3">
    <v-alert
      v-if="errorMessage"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      {{ errorMessage }}
    </v-alert>

    <v-row v-for="section in resolvedSections" :key="section.key">
      <v-col>
        <h4 class="about-section-title text-overline text-medium-emphasis">
          {{ section.title }}
        </h4>
        <!-- eslint-disable vue/no-v-html -->
        <div class="text-body-2 about-section-body" v-html="renderMarkdown(section.body)" />
        <!-- eslint-enable vue/no-v-html -->
      </v-col>
    </v-row>
  </v-container>
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
  String(value || "").replace(/^(#{1,6})(\S)/gm, "$1 $2");

const renderMarkdown = (value?: string) =>
  DOMPurify.sanitize(md.render(normalizeMarkdown(value)), {
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
.about-section-title {
  margin-bottom: 6px;
}

.about-section-body :deep(p) {
  margin-bottom: 12px;
}

.about-section-body :deep(p:last-child) {
  margin-bottom: 0;
}

.about-section-body :deep(a) {
  color: rgb(var(--v-theme-primary));
  text-decoration: underline;
  text-underline-offset: 2px;
}
</style>

