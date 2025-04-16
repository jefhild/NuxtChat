<template>
  <v-container>
    <v-row justify="center" class="title-bar">
      <v-col cols="12" md="8">
        <h1 class="page-title">{{ route.params.slug.toUpperCase() }}</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col v-for="article in articles" :key="article.id" cols="12" sm="6" md="4" class="d-flex">
        <ArticleCard :article="article" />
      </v-col>
    </v-row>

    <v-row v-if="!articles.length">
      <v-col class="text-center">
        <p>No articles found for this tag.</p>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
const { getArticlesByTagSlug, getTagsByArticle } = useDb();
const route = useRoute();

const articles = ref([]);

onMounted(async () => {
  const data = await getArticlesByTagSlug(route.params.slug);
  if (data) {
    const articlesWithTags = await Promise.all(
      data.map(async article => ({
			...article,
			tags: await getTagsByArticle(article.slug),
		}))
    );

    articles.value = articlesWithTags;
  }
});

</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 10px;
  padding: 20px;
  background-image: url('/images/bkg/tiedie4.webp');
  background-size: cover;
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
