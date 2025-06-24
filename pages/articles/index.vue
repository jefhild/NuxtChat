<template>
  <LoadingContainer
    v-if="isLoading"
    :text="$t('pages.articles.index.loading')"
  />

  <v-container fluid v-else>
    <HomeRow1 />
    <v-row align="center" justify="space-between" class="">
      <v-col cols="12" md="6">
        <h1>{{ $t("pages.articles.index.explore") }}</h1>
      </v-col>
    </v-row>
    <v-row
      ><ArticleSearchFilters
        :categories="categories"
        :tags="tags"
        v-model:searchQuery="searchQuery"
        :searchLabel="searchArticlesLabel"
        @categorySelected="goToCategory"
        @tagSelected="goToTag"
    /></v-row>

    <!-- Unified Search, Categories, and Tags Row -->
    <!-- <v-row align="center" justify="space-between" class="m-3">
      <v-col cols="12" md="4" class="d-flex">
        <v-select
          :items="categories"
          item-title="name"
          item-value="slug"
          label="Select Category"
          outlined
          density="compact"
          hide-details
          @update:modelValue="goToCategory"
          class="flex-grow-1"
        />
      </v-col>

      <v-col cols="12" md="4" class="d-flex">
        <v-select
          :items="tags"
          item-title="name"
          item-value="slug"
          label="Select Tag"
          outlined
          density="compact"
          hide-details
          @update:modelValue="goToTag"
          class="flex-grow-1"
        />
      </v-col>

      <v-col cols="12" md="4" class="d-flex">
        <v-text-field
          v-model="searchQuery"
          :label="searchArticlesLabel"
          prepend-inner-icon="mdi-magnify"
          clearable
          density="compact"
          outlined
          hide-details
          class="search-bar"
        />
      </v-col>
    </v-row> -->

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
        :to="localPath('/admin')"
        color="primary"
        variant="tonal"
      >
        Admin Panel
      </v-btn>
    </v-row>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
import { useI18n } from "vue-i18n";
const { getAllPublishedArticlesWithTags, getAllTags, getAllCategories } =
  useDb();

const authStore = useAuthStore();
const userProfile = ref(null);
const isLoading = ref(true);

const { t } = useI18n();
const searchArticlesLabel = computed(() => t("pages.articles.index.search"));

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

const router = useRouter();

function goToCategory(slug) {
  if (slug) router.push(localPath(`/categories/${slug}`));
}

function goToTag(slug) {
  if (slug) router.push(localPath(`/tags/${slug}`));
}

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
useSeoI18nMeta("articles.index");
</script>

<style scoped>
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

.v-chip {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.v-chip:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
</style>
