<template>
  <v-container v-if="isLoading" class="text-center">
			<v-progress-circular indeterminate color="primary"></v-progress-circular>
		</v-container>
    
  <v-container v-else class="article-list-container py-4">
    <!-- Top Row: Title + Search -->
    <v-row align="center" justify="space-between" class="mb-3">
      <v-col cols="12" md="6">
        <h1>Explore Our Articles</h1>
      </v-col>
      <v-col cols="12" md="6" class="d-flex justify-end">
        <v-text-field
          v-model="searchQuery"
          label="Search articles..."
          prepend-inner-icon="mdi-magnify"
          clearable
          dense
          outlined
          hide-details
          class="search-bar"
        />
      </v-col>
    </v-row>

    <!-- Categories Row -->
    <v-row class="mb-2">
      <v-col cols="12">
        <h2 class="section-title">Categories</h2>
        <div class="chip-group">
          <v-chip
            v-for="cat in categories"
            :key="cat.slug"
            class="ma-1"
            color="primary"
            variant="outlined"
            size="small"
            :to="`/categories/${cat.slug}`"
          >
            {{ cat.name }}
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Tags Row -->
    <v-row class="mb-8">
      <v-col cols="12">
        <h2 class="section-title">Tags</h2>
        <div class="chip-group">
          <v-chip
            v-for="tag in tags"
            :key="tag.slug"
            class="ma-1"
            size="small"
            color="deep-purple-lighten-2"
            variant="outlined"
            :to="`/tags/${tag.slug}`"
          >
            {{ tag.name }}
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <!-- Articles List -->
    <v-row dense>
      <v-col
        v-for="article in paginatedArticles"
        :key="article.id"
        cols="12"
        sm="6"
        md="4"
      >
        <ArticleCard :article="article" />
      </v-col>
    </v-row>

    <!-- No Articles Found -->
    <v-row v-if="!paginatedArticles.length" justify="center">
      <v-col cols="12" class="text-center">
        <v-alert type="info" variant="tonal" border="top" border-color="primary">
          No articles found for "{{ searchQuery }}".
        </v-alert>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <v-row justify="center" class="mt-8">
      <v-pagination v-model="currentPage" :length="pageCount" color="primary" />
    </v-row>

    <!-- Admin Button -->
    <v-row justify="center" class="mt-6">
      <v-btn v-if="userProfile?.is_admin" to="/admin" color="primary" variant="tonal">
        Admin Panel
      </v-btn>
    </v-row>

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


useSeoMeta({
  title: "ImChatty Blog – Tips, Updates & Community Stories",
  description:
    "Discover the latest tips, platform updates, and real community stories on the ImChatty Blog. Stay connected and informed.",
  ogTitle: "ImChatty Blog – Tips, Updates & Community Stories",
  ogDescription:
    "Explore helpful articles, platform news, and inspiring stories from the ImChatty community. Updated regularly with new insights.",
  ogImage: "https://imchatty.com/images/article-image.webp",
  twitterCard: "summary_large_image",
  twitterTitle: "ImChatty Blog – Your Source for Tips and Updates",
  twitterDescription:
    "Stay informed with the latest blog posts from ImChatty. From platform updates to dating and chat tips, we've got you covered.",
  twitterImage: "https://imchatty.com/images/article-image.webp"
});
</script>

<style scoped>
/* .page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 1.5rem;
  margin-bottom: 0;
} */

.section-title {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.search-bar {
  max-width: 400px;
  width: 100%;
}

.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.article-list-container {
  max-width: 1400px;
  margin: 0 auto;
}

.v-chip {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.v-chip:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
</style>
