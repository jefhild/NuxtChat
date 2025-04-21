<template>
  <v-container>
    <v-row justify="center" class="title-bar">
      <v-col cols="12" md="8">
        <h1 class="page-title">{{ route.params.slug.replaceAll('-', ' ').toUpperCase() }}</h1>
      </v-col>
    </v-row>

    <v-container v-if="isLoading">
      <v-row justify="center" class="py-12 text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-row>
    </v-container>

    <v-container v-else>
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

  </v-container>
</template>

<script setup>
const { getArticlesbyCategorySlug, getTagsByArticle } = useDb();
const route = useRoute();

const isLoading = ref(true);
const articles = ref([]);

onMounted(async () => {
  const data = await getArticlesbyCategorySlug(route.params.slug);
  if (data) {
    const articlesWithTags = await Promise.all(
      data.map(async article => ({
			...article,
			tags: await getTagsByArticle(article.slug),
		}))
    );

    articles.value = articlesWithTags;
  }
  isLoading.value = false;
});

</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 10px;
  padding: 20px;
  background-image: url('/images/bkg/tiedie2.webp');
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
