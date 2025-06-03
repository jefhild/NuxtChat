<template>
  <v-container v-if="isLoading" class="text-center">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-container>

  <v-container v-else class="article-list-container py-4">
    <!-- Top Row: Title + Search -->
    <v-row align="center" justify="space-between" class="mb-3">
      <v-col cols="12" md="6">
        <h1>{{ $t("pages.articles.index.explore") }}</h1>
      </v-col>
      <v-col cols="12" md="6" class="d-flex justify-end">
        <v-text-field
          v-model="searchQuery"
          :label="searchArticlesLabel"
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
        <h2 class="section-title">{{ $t("pages.articles.index.categories") }}</h2>
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
        <h2 class="section-title">{{ $t("pages.articles.index.tags") }}</h2>
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
        <v-alert
          type="info"
          variant="tonal"
          border="top"
          border-color="primary"
        >
        {{ $t("pages.articles.index.no-articles") }} "{{ searchQuery }}".
        </v-alert>
      </v-col>
    </v-row>

    <!-- Pagination -->
    <v-row justify="center" class="mt-8">
      <v-pagination v-model="currentPage" :length="pageCount" color="primary" />
    </v-row>

    <!-- Admin Button -->
    <v-row justify="center" class="mt-6">
      <v-btn
        v-if="userProfile?.is_admin"
        to="/admin"
        color="primary"
        variant="tonal"
      >
        Admin Panel
      </v-btn>
    </v-row>
  </v-container>
</template>

<script setup>
import { useI18n } from 'vue-i18n';
const { getAllPublishedArticlesWithTags, getAllTags, getAllCategories } =
  useDb();

const authStore = useAuthStore();
const userProfile = ref(null);
const isLoading = ref(true);

const { t } = useI18n();
const searchArticlesLabel = computed(() =>
  t("pages.articles.index.search")
);

const searchQuery = ref("");
const articles = ref([]);
const tags = ref([]);
const categories = ref([]);

const currentPage = ref(1);
const perPage = 10;

const filteredArticles = computed(() => {
  if (!searchQuery.value) return articles.value;

  return articles.value.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const paginatedArticles = computed(() => {
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

const seoTitle = computed(() => t("pages.articles.index.meta.title"));
const seoDescription = computed(() => t("pages.articles.index.meta.description"));
const ogTitle = computed(() => t("pages.articles.index.meta.ogTitle"));
const ogType = computed(() => t("pages.articles.index.meta.ogType"));
const ogUrl = computed(() => t("pages.articles.index.meta.ogUrl"));
const ogDescription = computed(() =>
  t("pages.articles.index.meta.ogDescription")
);
const ogImage = computed(() => t("pages.articles.index.meta.ogImage"));
const twitterTitle = computed(() => t("pages.articles.index.meta.twitterTitle"));
const twitterCard = computed(() => t("pages.articles.index.meta.twitterCard"));
const twitterDescription = computed(() =>
  t("pages.articles.index.meta.twitterDescription")
);
const twitterImage = computed(() => t("pages.articles.index.meta.twitterImage"));

useHead(() => ({
  link: [
    {
      rel: "canonical",
      href: "https://imchatty.com/articles",
    },
  ],
}));

useSeoMeta({
  title: seoTitle.value,
  description: seoDescription.value,
  ogTitle: ogTitle.value,
  ogType: ogType.value,
  ogUrl: ogUrl.value,
  ogDescription: ogDescription.value,
  ogImage: ogImage.value,
  twitterCard: twitterCard.value,
  twitterTitle: twitterTitle.value,
  twitterDescription: twitterDescription.value,
  twitterImage: twitterImage.value,
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
