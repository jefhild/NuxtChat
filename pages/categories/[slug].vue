<template>
  <v-container>
    <h1 class="text-h4 font-weight-bold mb-6">
     	Articles in “{{ route.params.slug.replaceAll('-', ' ') }}”
    </h1>

    <v-row dense>
      <v-col
        v-for="article in articles"
        :key="article.id"
        cols="12"
        sm="6"
        md="4"
        lg="3"
        class="d-flex"
      >
        <v-card
          :to="`/articles/${article.slug}`"
          class="article-card pa-4 d-flex flex-column justify-between"
          elevation="3"
        >
          <v-card-title class="font-weight-bold text-wrap">
            {{ article.title }}
          </v-card-title>

          <v-card-subtitle class="mb-2 text-medium-emphasis">
            {{ formatDate(article.created_at) }} · {{ article.category_name }}
          </v-card-subtitle>

          <v-card-text>
            <v-chip
              v-for="tag in article.tags"
              :key="tag.slug"
              class="ma-1"
              size="small"
              color="primary"
              variant="outlined"
            >
              {{ tag.name }}
            </v-chip>
          </v-card-text>
        </v-card>
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
const { getArticlesbyCategorySlug, getTagsByArticle } = useDb();
const route = useRoute();

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
});

const formatDate = (isoDate) => {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};
</script>

<style scoped>
.article-card {
  height: 100%;
  min-height: 250px;
  border: 1px solid #e0e0e0;
  transition: box-shadow 0.2s ease;
  border-radius: 20px;
  margin: 0px 10px;
}
.article-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}
</style>
