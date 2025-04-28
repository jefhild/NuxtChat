<template>
  <v-container class="article-list-container">
    <!-- <v-row justify="center" class="title-bar"> -->
      <v-col cols="12" md="8">
        <h1 >Explore Our Articles</h1>
      </v-col>
    <!-- </v-row> -->

    <v-container v-if="isLoading">
      <v-row justify="center" class="py-12 text-center">
        <v-progress-circular indeterminate color="primary"></v-progress-circular>
      </v-row>
    </v-container>

    <v-container v-else>
      <v-row>
        <!-- Article List -->
        <v-col cols="12" md="8" class="articles-column">
          <div class="articles-wrapper">
            <!-- Search -->
            <v-text-field v-model="searchQuery" label="Search articles..." prepend-inner-icon="mdi-magnify" clearable
              class="mb-4" />

            <!-- Article Cards -->
            <v-row dense>
              <v-col v-for="article in paginatedArticles" :key="article.id" cols="12" sm="6">
                <ArticleCard :article="article" />
              </v-col>
            </v-row>

            <v-alert v-if="!paginatedArticles.length" type="info" variant="tonal" border="top" border-color="primary">
              No articles found for "{{ searchQuery }}".
            </v-alert>


            <!-- Pagination -->
            <v-pagination v-model="currentPage" :length="pageCount" class="mt-6" color="primary"></v-pagination>
          </div>
        </v-col>

        <!-- Sidebar -->
        <v-col cols="12" md="4">
          <v-card class="mt-5 mb-10 sidebar-card" elevation="2">
            <v-card-title class="font-weight-bold">
              <NuxtLink class="nostyle" to="/categories">Categories</NuxtLink>
            </v-card-title>
            <v-card-text>
              <v-chip v-for="cat in categories" :key="cat.slug" class="ma-1" color="primary" variant="outlined"
                :to="`/categories/${cat.slug}`">
                {{ cat.name }}
              </v-chip>
            </v-card-text>
          </v-card>

          <v-card elevation="2" class="sidebar-card">
            <v-card-title class="font-weight-bold">
              <NuxtLink class="nostyle" to="/tags">Tags</NuxtLink>
            </v-card-title>
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
  </v-container>
</template>

<script setup>
const { getAllPublishedArticlesWithTags, getAllTags, getAllCategories } = useDb();

const authStore = useAuthStore();
const userProfile = ref(null);
const isLoading = ref(true);

const searchQuery = ref('');
const articles = ref([]);
const tags = ref([]);
const categories = ref([]);

const currentPage = ref(1);
const perPage = 10;

const filteredArticles = computed(() =>
{
  if (!searchQuery.value) return articles.value;

  return articles.value.filter(article =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const paginatedArticles = computed(() =>
{
  const start = (currentPage.value - 1) * perPage;
  return filteredArticles.value.slice(start, start + perPage);
});

const pageCount = computed(() =>
  Math.ceil(filteredArticles.value.length / perPage)
);

onMounted(async () => {
  await authStore.checkAuth();
  userProfile.value = authStore.userProfile;
  const articleData = await getAllPublishedArticlesWithTags();
  const tagData = await getAllTags();
  const categoryData = await getAllCategories();

  if (articleData) articles.value = articleData;
  if (tagData) tags.value = tagData;
  if (categoryData) categories.value = categoryData;
  isLoading.value = false;
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

.articles-wrapper {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
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

.nostyle{
  text-decoration: none;
  color: inherit;
}

</style>
