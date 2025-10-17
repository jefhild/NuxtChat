<template>
  <LoadingContainer
    v-if="isLoading"
    :text="$t('pages.articles.index.loading')"
  />

  <v-container fluid v-else>
    <!-- <HomeRow1 /> -->

    <PageHeader
      :text="$t('pages.articles.tags.heading')"
      :subtitle="$t('pages.articles.tags.subtitle')"
    />

    <v-row>
      <!-- <v-col>
        <h1>{{ $t("pages.tags.index.title") }}</h1>
      </v-col> -->
      <!-- <v-col>
        <v-text-field
          v-model="searchQuery"
          :label="searchLabel"
          prepend-inner-icon="mdi-magnify"
          clearable
          density="compact"
          outlined
          hide-details
          class="search-bar"
        />
      </v-col> -->
    </v-row>

    <LoadingContainer v-if="isLoading" />

    <v-container v-else>
      <v-row>
        <v-col>
          <!-- Categories: neutral (no highlight on tags index) -->
          <FilterExpansion
            :title="$t('pages.categories.index.title')"
            :items="categories"
            base-path="/categories"
            :selected-slug="null"
            panels-class="compact-panel"
            variant="inset"
          >
            <template #title="{ selectedName, title }">
              <span>Categories: {{ selectedName || title }}</span>
            </template>
          </FilterExpansion>
        </v-col>

        <v-col>
          <!-- Tags: highlight current route param -->
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
const { t } = useI18n();
const {
  getAllTags,
  getAllCategories,
  getCountArticleByTag,
  getAllPublishedArticlesWithTags,
} = useDb();
const isLoading = ref(true);
const authStore = useAuthStore();
const tags = ref([]);
const categories = ref([]);
const articles = ref([]);
const searchQuery = ref("");
const currentPage = ref(1);
const perPage = 10;

const searchLabel = computed(() => t("pages.articles.index.search"));

useSeoI18nMeta("tags.index");

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

  const [rawTags, rawCategories, articleData] = await Promise.all([
    getAllTags(),
    getAllCategories(),
    getAllPublishedArticlesWithTags(),
  ]);

  const tagsWithCounts = await Promise.all(
    rawTags.map(async (tag) => {
      const count = await getCountArticleByTag(tag.id);
      return { ...tag, articleCount: count };
    })
  );

  tags.value = tagsWithCounts;
  categories.value = rawCategories;
  if (articleData) articles.value = articleData;

  isLoading.value = false;
});
</script>

<style scoped>
h1 {
  font-size: 1.6rem;
}
.text-decoration-none {
  text-decoration: none;
}
.font-weight-medium {
  font-weight: 500;
}
</style>
