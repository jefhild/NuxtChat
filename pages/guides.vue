<template>
  <v-container>
    <v-row justify="center" class="title-bar">
      <v-col cols="12" md="8">
        <h1 class="page-title">All of our guides</h1>
      </v-col>
    </v-row>

    <v-container v-if="isLoading">
      <v-row justify="center" class="py-12 text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </v-row>
    </v-container>

    <v-container v-else>
      <v-text-field
        v-model="searchQuery"
        label="Search articles..."
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
        No articles found for "{{ searchQuery }}".
      </v-alert>

      <v-row v-if="!articlesData?.length">
        <v-col class="text-center">
          <p>No articles found for this type.</p>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
const { getArticlesByType, getTagsByArticle } = useDb();

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

useSeoMeta({
  title: "Popular Guides",
  description:
    "Check out our most recent guides! Browse guides of genuine interest.",
  ogTitle: "Popular Guides - Help",
  ogDescription:
    "Check out our most recent guides! Help getting started, tips, and how to protect yourself.",
  // ogImage: popularProfiles[0].value.avatar_url,
  twitterCard: "summary_large_image",
  twitterTitle: "Popular Guide Insights",
  twitterDescription:
    "Check out our most popular guides and insights! Browse guides of genuine interest, built by a human, and possibly life changing!",
  // twitterImage: popularProfiles[0].value.avatar_url,
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
