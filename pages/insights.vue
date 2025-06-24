<template>
  <v-container fluid>
    <LoadingContainer v-if="isLoading" />

    <v-container fluid v-else>
      <v-text-field
        v-model="searchQuery"
        :label="searchArticlesLabel"
        prepend-inner-icon="mdi-magnify"
        clearable
        class="mb-4"
      />

      <v-row>
        <v-col
          v-for="article in filteredArticles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <ArticleCard :article="article" />
        </v-col>
      </v-row>

      <v-alert
        v-if="!filteredArticles.length"
        type="info"
        variant="tonal"
        border="top"
        border-color="primary"
      >
        {{ $t("pages.articles.index.no-articles") }} "{{ searchQuery }}".
      </v-alert>
      <v-row v-if="!articlesData?.length">
        <v-col class="text-center">
          <p>{{ $t("pages.guides.no-articles") }}</p>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
const { getArticlesByType, getTagsByArticle } = useDb();

import { useI18n } from "vue-i18n";
const { t } = useI18n();

const searchArticlesLabel = computed(() => t("pages.articles.index.search"));

const { data: articlesData, pending: isLoading } = await useAsyncData(
  "articles",
  async () => {
    const articles = await getArticlesByType("blog");

    return await Promise.all(
      articles.map(async (article) => ({
        ...article,
        tags: await getTagsByArticle(article.slug),
        category_name: article.category?.name,
      }))
    );
  }
);

const searchQuery = ref("");

const filteredArticles = computed(() => {
  if (!searchQuery.value) return articlesData.value || [];

  return (articlesData.value || []).filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/insights",
    },
  ],
}));

const seoTitle = computed(() => t("pages.insights.meta.title"));
const seoDescription = computed(() => t("pages.insights.meta.description"));
const ogTitle = computed(() => t("pages.insights.meta.ogTitle"));
const ogUrl = computed(() => t("pages.insights.meta.ogUrl"));
const ogType = computed(() => t("pages.insights.meta.ogType"));
const ogImage = computed(() => t("pages.insights.meta.ogImage"));
const ogDescription = computed(() => t("pages.insights.meta.ogDescription"));
const twitterTitle = computed(() => t("pages.insights.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.insights.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.insights.meta.twitterDescription")
);

useSeoMeta({
  title: seoTitle.value,
  description: seoDescription.value,
  ogTitle: ogTitle.value,
  ogType: ogType.value,
  ogUrl: ogUrl.value,
  ogImage: ogImage.value,
  ogDescription: ogDescription.value,
  twitterCard: twitterCard.value,
  twitterTitle: twitterTitle.value,
  twitterDescription: twitterDescription.value,
});
</script>

<style scoped>
.page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 2.8rem;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 2.5rem;
  color: #1f1f1f;
}
</style>
