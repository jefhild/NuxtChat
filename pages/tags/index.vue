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
          v-for="article in visibleArticles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
        >
          <ArticleCard :article="article" />
        </v-col>
      </v-row>

      <!-- No Articles Found -->
      <v-row v-if="!filteredArticles.length" justify="center">
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

      <v-row
        v-if="isFetchingMore && hasMoreArticles"
        justify="center"
        class="my-6"
      >
        <v-col cols="auto">
          <v-progress-circular indeterminate color="primary" />
        </v-col>
      </v-row>

      <div
        ref="infiniteScrollTrigger"
        class="infinite-scroll-trigger"
        aria-hidden="true"
      ></div>
    </v-container>
  </v-container>
</template>

<script setup>
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
const perPage = 12;
const visibleCount = ref(perPage);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const searchLabel = computed(() => t("pages.articles.index.search"));

useSeoI18nMeta("tags.index");

const filteredArticles = computed(() => {
  if (!searchQuery.value) return articles.value;
  return articles.value.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const visibleArticles = computed(() =>
  filteredArticles.value.slice(0, visibleCount.value)
);
const hasMoreArticles = computed(
  () => visibleCount.value < filteredArticles.value.length
);

const loadMoreArticles = () => {
  if (!hasMoreArticles.value || isFetchingMore.value || isLoading.value) {
    return;
  }
  isFetchingMore.value = true;
  setTimeout(() => {
    visibleCount.value = Math.min(
      visibleCount.value + perPage,
      filteredArticles.value.length
    );
    isFetchingMore.value = false;
  }, 150);
};

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

  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMoreArticles();
        }
      },
      { rootMargin: "0px 0px 200px 0px", threshold: 0 }
    );
  }

  if (infiniteScrollTrigger.value) {
    intersectionObserver.observe(infiniteScrollTrigger.value);
  }
});

watch(filteredArticles, () => {
  visibleCount.value = perPage;
  isFetchingMore.value = false;
});

watch(
  () => infiniteScrollTrigger.value,
  (el) => {
    if (!intersectionObserver || !el) return;
    intersectionObserver.disconnect();
    intersectionObserver.observe(el);
  }
);

onBeforeUnmount(() => {
  intersectionObserver?.disconnect();
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

.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
