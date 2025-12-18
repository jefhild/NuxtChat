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
          :text="$t('pages.people.index.heading')"
          :subtitle="$t('pages.people.index.subtitle')"
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
      aria-label="People filters"
    >
      <div class="d-flex align-center justify-space-between px-3 py-3">
        <span class="text-subtitle-1 font-weight-medium">
          {{ $t("pages.people.index.heading") }}
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
          :selected-slug="null"
          panels-class="compact-panel"
          variant="inset"
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
          :selected-slug="null"
          panels-class="compact-panel"
          variant="inset"
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

    <v-container fluid v-else>

      <v-row dense>
        <v-col
          v-for="article in visibleArticles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
        >
          <ArticleCard
            :article="article"
            :chatThreadId="article.threadSlug ?? undefined"
          />
        </v-col>
      </v-row>

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
const { t } = useI18n();
const authStore = useAuthStore();
const {
  getAllPublishedArticlesWithTags,
  getAllCategories,
  getAllTags,
  getAllPeople,
} = useDb();

const isLoading = ref(true);
const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const people = ref([]);
const openFilterPanel = ref(null);
const filtersOpen = ref(false);
const filtersDrawerStyle = { zIndex: 1004, transition: "none !important" };
const searchQuery = ref("");

const perPage = 12;
const visibleCount = ref(perPage);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const searchLabel = computed(() => t("pages.articles.index.search"));

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

useSeoI18nMeta("people.index");

onMounted(async () => {
  await authStore.checkAuth();

  const [articleData, categoryData, tagData, peopleData] = await Promise.all([
    getAllPublishedArticlesWithTags(),
    getAllCategories(),
    getAllTags(),
    getAllPeople(),
  ]);

  articles.value = articleData || [];
  categories.value = categoryData || [];
  tags.value = tagData || [];
  people.value = peopleData || [];

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
.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
