<template>
  <v-container class="article-list-container">
    <v-row justify="center" class="title-bar">
      <v-col cols="12" md="8">
        <h1 class="page-title">Explore Our Articles</h1>
      </v-col>
    </v-row>


    <v-row>
      <!-- Article List -->
      <v-col cols="12" md="8" class="articles-column">
        <v-row dense>
          <v-col v-for="article in paginatedArticles" :key="article.id" cols="12" sm="6">
            <ArticleCard :article="article" />
          </v-col>
        </v-row>

        <!-- Pagination -->
        <v-pagination v-model="currentPage" :length="pageCount" class="mt-6" color="primary"></v-pagination>
      </v-col>

      <!-- Sidebar -->
      <v-col cols="12" md="4">
        <v-card class="mt-5 mb-10 sidebar-card" elevation="2">
          <v-card-title class="font-weight-bold">Categories</v-card-title>
          <v-card-text>
            <v-chip v-for="cat in categories" :key="cat.slug" class="ma-1" color="primary" variant="outlined"
              :to="`/categories/${cat.slug}`">
              {{ cat.name }}
            </v-chip>
          </v-card-text>
        </v-card>

        <v-card elevation="2" class="sidebar-card">
          <v-card-title class="font-weight-bold">Tags</v-card-title>
          <v-card-text>
            <v-chip v-for="tag in tags" :key="tag.slug" class="ma-1" size="small" color="deep-purple-lighten-2"
              variant="outlined" :to="`/tags/${tag.slug}`">
              {{ tag.name }}
            </v-chip>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-btn v-if="userProfile?.is_admin" to="/admin">Admin Panel</v-btn>
</template>

<script setup>
const { getAllArticlesWithTags, getAllTags, getAllCategories } = useDb();

const authStore = useAuthStore();
const userProfile = authStore.userProfile;

const articles = ref([]);
const tags = ref([]);
const categories = ref([]);

const currentPage = ref(1);
const perPage = 4;

const pageCount = computed(() =>
  Math.ceil(articles.value.length / perPage)
);

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return articles.value.slice(start, start + perPage);
});

onMounted(async () => {
  const articleData = await getAllArticlesWithTags();
  const tagData = await getAllTags();
  const categoryData = await getAllCategories();

  if (articleData) articles.value = articleData;
  if (tagData) tags.value = tagData;
  if (categoryData) categories.value = categoryData;
});
</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 10px;
  padding: 20px;
  background-image: url('/images/bkg/tiediebkg.webp');
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: black;
}

.page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 2.8rem;
  text-align: center;
  margin: 2.5rem 0;
}

.article-list-container {
  max-width: 1200px;
  margin: 0 auto;
}

.articles-column {
  min-height: 722px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.sidebar-card{
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  margin: 0px 10px;
}

.v-chip {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.v-chip:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}

</style>
