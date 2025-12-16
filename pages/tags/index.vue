<template>
  <v-container fluid>
    <v-row class="align-center mb-2 ga-2">
      <v-col cols="auto" class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <PageHeader
          :text="$t('pages.articles.tags.heading')"
          :subtitle="$t('pages.articles.tags.subtitle')"
        />
      </v-col>
    </v-row>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="360"
      :style="filtersDrawerStyle"
      class="filters-drawer"
      aria-label="Tag filters"
    >
      <div class="d-flex align-center justify-space-between px-3 py-3">
        <span class="text-subtitle-1 font-weight-medium">
          {{ $t("pages.tags.index.title") }}
        </span>
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Close filters"
          @click="filtersOpen = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <v-divider />
      <div class="px-3 py-2 d-flex flex-column ga-3">
        <FilterExpansion
          v-model="openFilterPanel"
          panel-key="categories"
          :title="$t('pages.categories.index.title')"
          :items="categories"
          base-path="/categories"
          :selected-slug="null"
          panels-class="compact-panel"
          variant="inset"
          :scrolling-list="true"
        >
          <template #title="{ selectedName, title }">
            <span>Categories: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>

        <FilterExpansion
          v-model="openFilterPanel"
          panel-key="tags"
          :title="$t('pages.tags.index.title')"
          :items="tags"
          base-path="/tags"
          :selected-slug="route.params?.slug || null"
          panels-class="compact-panel"
          variant="inset"
          :scrolling-list="true"
        >
          <template #title="{ selectedName, title }">
            <span>Tags: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>

        <FilterExpansion
          v-model="openFilterPanel"
          panel-key="people"
          :title="$t('pages.people.index.title')"
          :items="people"
          base-path="/people"
          :selected-slug="route.params?.slug || null"
          panels-class="compact-panel"
          variant="inset"
          :scrolling-list="true"
        >
          <template #title="{ selectedName, title }">
            <span>People: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>
      </div>
    </v-navigation-drawer>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <template v-else>
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
    </template>
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
  getAllPeople,
} = useDb();
const isLoading = ref(true);
const authStore = useAuthStore();
const tags = ref([]);
const categories = ref([]);
const people = ref([]);
const articles = ref([]);
const filtersDrawerStyle = { zIndex: 1004, transition: "none !important" };
const searchQuery = ref("");
const openFilterPanel = ref(null);
const filtersOpen = ref(false);
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

  const [rawTags, rawCategories, articleData, peopleData] = await Promise.all([
    getAllTags(),
    getAllCategories(),
    getAllPublishedArticlesWithTags(),
    getAllPeople(),
  ]);

  const tagsWithCounts = await Promise.all(
    rawTags.map(async (tag) => {
      const count = await getCountArticleByTag(tag.id);
      return { ...tag, articleCount: count };
    })
  );

  tags.value = tagsWithCounts;
  categories.value = rawCategories;
  people.value = peopleData || [];
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
