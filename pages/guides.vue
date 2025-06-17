<template>
  <v-container>
    <v-row justify="center" class="title-bar">
      <v-col cols="12" md="8">
        <h1 class="page-title">{{ $t("pages.guides.title") }}</h1>
      </v-col>
    </v-row>

    <LoadingContainer v-if="isLoading" />

    <v-container v-else>
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
        v-if="!filteredArticles.length && articlesData?.length"
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

const searchArticlesLabel = computed(() =>
  t("pages.articles.index.search")
);

const { data: articlesData, pending: isLoading } = await useAsyncData(
  "guide-articles",
  async () => {
    const articles = await getArticlesByType("guide");

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
  const articles = articlesData.value || [];
  if (!searchQuery.value) return articles;

  return articles.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/guides",
    },
  ],
}));

const seoTitle = computed(() => t("pages.guides.meta.title"));
const seoDescription = computed(() => t("pages.guides.meta.description"));
const ogTitle = computed(() => t("pages.guides.meta.ogTitle"));
const ogUrl = computed(() => t("pages.guides.meta.ogUrl"));
const ogDescription = computed(() =>
  t("pages.guides.meta.ogDescription")
);
const twitterTitle = computed(() => t("pages.guides.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.guides.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.guides.meta.twitterDescription")
);

useSeoMeta({
  title: seoTitle.value,
  description: seoDescription.value,
  ogTitle: ogTitle.value,
  ogUrl: ogUrl.value,
  ogDescription: ogDescription.value,
  twitterCard: twitterCard.value,
  twitterTitle: twitterTitle.value,
  twitterDescription: twitterDescription.value,
});
</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 10px;
  padding: 20px;
  background-image: url("/images/bkg/tiediebkg.webp");
  background-position: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: black;
  margin-bottom: 1.5rem;
}

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
