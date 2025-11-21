<template>
  <LoadingContainer
    v-if="isLoading"
    :text="$t('pages.articles.index.loading')"
  />

  <v-container fluid v-else>
    <!-- <HomeRow1 /> -->

    <PageHeader
      :text="$t('pages.articles.index.heading')"
      :subtitle="$t('pages.articles.index.subtitle')"
    />

    <v-row>
      <!-- <v-col>
        <h1>{{ $t("pages.articles.index.explore") }}</h1>
      </v-col>
       -->

      <v-col>
        <FilterExpansion
          :title="$t('pages.categories.index.title')"
          :selected-name="selectedCategoriesName"
          :items="categories"
          base-path="/categories"
          :selected-slug="route.params?.slug || null"
          panels-class="compact-panel"
          :scrolling-list="true"
        />
      </v-col>

      <v-col>
        <FilterExpansion
          :title="$t('pages.tags.index.title')"
          :selected-name="selectedTagName"
          :items="tags"
          base-path="/tags"
          :selected-slug="route.params?.slug || null"
          panels-class="compact-panel"
          :scrolling-list="true"
        />
      </v-col>

      <v-col>
        <FilterExpansion
          :title="$t('pages.people.index.title')"
          :selected-name="selectedPeopleName"
          :items="people"
          base-path="/people"
          :selected-slug="route.params?.slug || null"
          panels-class="compact-panel"
          :scrolling-list="true"
        />
      </v-col>

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
    <!-- Articles List -->
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

    <!-- Admin Button -->

  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const route = useRoute();
const {
  getAllPublishedArticlesWithTags,
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
const tags = ref([]);
const categories = ref([]);
const people = ref([]);
const perPage = 12;
const visibleCount = ref(perPage);
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
    getAllPublishedArticlesWithTags(),
    getAllTags(),
    getAllCategories(),
    getAllPeople(),
  ]);

  articles.value = articleData || [];
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
