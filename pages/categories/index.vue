<template>
  <v-container fluid>
    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.categories.index.loading')"
    />

    <v-container fluid v-else>
      <!-- <HomeRow1 /> -->
      <!-- <v-row>
        <v-col>
          <h1>{{ $t("pages.categories.index.title") }}</h1>
        </v-col>
      </v-row> -->

    <PageHeader
      :text="$t('pages.articles.categories.heading')"
      :subtitle="$t('pages.articles.categories.subtitle')"
    />


      <v-row>
        <v-col>
          <FilterExpansion
            :title="$t('pages.categories.index.title')"
            :items="categories"
            base-path="/categories"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            variant="inset"
          >
            <template #title="{ selectedName, title }">
              <span>Categories: {{ selectedName || title }}</span>
            </template>
          </FilterExpansion>
        </v-col>

        <v-col>
          <FilterExpansion
            :title="$t('pages.tags.index.title')"
            :items="tags"
            base-path="/tags"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            variant="inset"
          >
            <template #title="{ selectedName, title }">
              <span>Tags: {{ selectedName || title }}</span>
            </template>
          </FilterExpansion>
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
        <v-pagination
          v-model="currentPage"
          :length="pageCount"
          color="primary"
        />
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
const localPath = useLocalePath();
const route = useRoute();
import { useI18n } from "vue-i18n";
const {
  getAllCategories,
  getCountArticleByCategory,
  getAllPublishedArticlesWithTags,
  getAllTags,
} = useDb();
const isLoading = ref(true);
const authStore = useAuthStore();
const searchQuery = ref("");
const articles = ref([]);
const tags = ref([]);
const categories = ref([]);
const { t } = useI18n();
const currentPage = ref(1);
const perPage = 10;

const searchLabel = computed(() => t("pages.articles.index.search"));

useSeoI18nMeta("categories.index");

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
  // userProfile.value = authStore.userProfile;
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
h1 {
  font-size: 1.6rem;
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

.category-container {
  flex-wrap: wrap;
  max-width: 900px;
  margin: 0 auto;
}

.category-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background-color: #1565c0;
  /* Light blue background */
  color: #e3f2fd;
  /* Blue border */
  border-radius: 999px;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
}

.category-link:hover {
  background-color: #bbdefb;
  /* Darker on hover */
  color: #0d47a1;
}
</style>
