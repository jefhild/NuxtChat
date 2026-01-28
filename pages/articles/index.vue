<template>
  <v-container fluid class="articles-shell">
    <div class="articles-header-shell">
      <div class="articles-header-actions">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          class="articles-menu-btn"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader
        :text="$t('pages.articles.index.heading')"
        :subtitle="$t('pages.articles.index.subtitle')"
      />
    </div>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="280"
      class="articles-drawer"
      aria-label="Article filters"
    >
      <v-list density="compact" class="articles-drawer-list">
        <v-list-subheader>{{ $t("pages.articles.index.filters") }}</v-list-subheader>
        <div class="px-3 py-2 d-flex flex-column ga-3">
          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="categories"
            :title="$t('pages.categories.index.title')"
            :selected-name="selectedCategoriesName"
            :items="categories"
            base-path="/categories"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            :scrolling-list="true"
          />

          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="tags"
            :title="$t('pages.tags.index.title')"
            :selected-name="selectedTagName"
            :items="tags"
            base-path="/tags"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            :scrolling-list="true"
          />

          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="people"
            :title="$t('pages.people.index.title')"
            :selected-name="selectedPeopleName"
            :items="people"
            base-path="/people"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            :scrolling-list="true"
          />
        </div>
      </v-list>
    </v-navigation-drawer>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <template v-else>
      <!-- <HomeRow1 /> -->
      <!-- Articles List -->
      <v-row dense>
        <v-col v-for="article in filteredArticles" :key="article.id" cols="12" sm="6" md="4">
          <ArticleCard
            :article="article"
            :chat-thread-id="
              threadByArticleId[article.id] || article.thread_id || null
            "
          />
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

      <v-row v-if="isFetchingMore && hasMoreArticles" justify="center" class="my-6">
        <v-col cols="auto">
          <v-progress-circular indeterminate color="primary" />
        </v-col>
      </v-row>

      <div
        ref="infiniteScrollTrigger"
        class="infinite-scroll-trigger"
        aria-hidden="true"
      ></div>

      <!-- Admin Button -->
    </template>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const route = useRoute();
const {
  getPublishedArticlesPage,
  getAllTags,
  getAllCategories,
  getAllPeople,
} = useDb();
const authStore = useAuthStore();
const { t } = useI18n();
const userProfile = ref(null);
const isLoading = ref(true);
const searchQuery = ref("");
const searchLabel = computed(() => t("pages.articles.index.search"));
const articles = ref([]);
const filtersOpen = ref(false);
const openFilterPanel = ref(null);
const tags = ref([]);
const categories = ref([]);
const people = ref([]);
const perPage = 12;
const currentOffset = ref(0);
const hasMoreArticles = ref(true);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

// Filter and paginate articles
const filteredArticles = computed(() => {
  if (!searchQuery.value) return articles.value;
  return articles.value.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const fetchNextPage = async () => {
  if (!hasMoreArticles.value || isFetchingMore.value) return;
  isFetchingMore.value = true;

  const nextPage = await getPublishedArticlesPage({
    limit: perPage,
    offset: currentOffset.value,
  });

  if (nextPage.length < perPage) {
    hasMoreArticles.value = false;
  }

  if (nextPage.length) {
    const existingIds = new Set(articles.value.map((article) => article.id));
    const uniqueNext = nextPage.filter((article) => !existingIds.has(article.id));
    articles.value = [...articles.value, ...uniqueNext];
    currentOffset.value += nextPage.length;
  }

  isFetchingMore.value = false;
};

const loadMoreArticles = () => {
  if (isLoading.value) return;
  fetchNextPage();
};

// Selected display names for UI
const selectedTagName = computed(() => {
  const slug = route.params?.slug;
  return tags.value.find((t) => t.slug === slug)?.name || null;
});

const selectedCategoriesName = computed(() => {
  const slug = route.params?.slug;
  return categories.value.find((c) => c.slug === slug)?.name || null;
});

const selectedPeopleName = computed(() => {
  const slug = route.params?.slug;
  return people.value.find((p) => p.slug === slug)?.name || null;
});

const { data: chatMap } = await useAsyncData("chat-map", () =>
  $fetch("/api/articles/chat-map")
);
// Fallback to {} if null
const threadByArticleId = computed(() => chatMap.value || {});

// Load data
onMounted(async () => {
  await authStore.checkAuth();
  userProfile.value = authStore.userProfile;

  const [articleData, tagData, categoryData, peopleData] = await Promise.all([
    getPublishedArticlesPage({ limit: perPage, offset: 0 }),
    getAllTags(),
    getAllCategories(),
    getAllPeople(),
  ]);

  articles.value = articleData || [];
  currentOffset.value = articles.value.length;
  hasMoreArticles.value = articles.value.length === perPage;
  tags.value = tagData || [];
  categories.value = categoryData || [];
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

useSeoI18nMeta("articles.index");
</script>

<style scoped>
h1 {
  font-size: 1.6rem;
}
.section-title {
  font-family: "Poppins", sans-serif;
  font-weight: 600;
  font-size: 1.2rem;
  margin-bottom: 0.5rem;
}

.articles-shell {
  padding-top: 6px;
}

.articles-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.articles-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.articles-menu-btn {
  margin: 0;
}

.articles-drawer {
  margin-top: 64px;
  height: calc(100% - 64px);
  overflow: hidden;
}

.articles-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.search-bar {
  max-width: 400px;
  width: 100%;
}

.compact-panel .v-expansion-panel-title {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  min-height: 32px !important; /* optional */
}

.compact-panel .v-expansion-panel-text__wrapper {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
