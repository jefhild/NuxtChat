<template>
  <LoadingContainer
    v-if="isLoading"
    :text="$t('pages.articles.index.loading')"
  />

  <v-container fluid v-else>
    <HomeRow1 />
    <v-row>
      <v-col>
        <h1>{{ $t("pages.articles.index.explore") }}</h1>
      </v-col>
      <v-col>
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
      </v-col>
    </v-row>
    <!-- <v-row
      ><ArticleSearchFilters
        :categories="categories"
        :tags="tags"
        v-model:searchQuery="searchQuery"
        :searchLabel="searchArticlesLabel"
        @categorySelected="goToCategory"
        @tagSelected="goToTag"
    /></v-row> -->

    <v-row
      ><v-col>
        <v-expansion-panels variant="inset" class="my-4">
          <v-expansion-panel>
            <v-expansion-panel-title>
              Categories<span
                >:
                {{
                  selectedCategoriesName || $t("pages.categories.index.title")
                }}</span
              >
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <v-row no-gutters>
                <v-col
                  v-for="category in categories"
                  :key="category.slug"
                  cols="auto"
                  class="my-1 mx-3"
                >
                  <NuxtLink
                    :to="
                      category.slug === 'all'
                        ? localPath('/categories')
                        : localPath(`/categories/${category.slug}`)
                    "
                    :class="[
                      'text-decoration-none font-weight-medium',
                      {
                        'text-primary':
                          route.params?.slug === category.slug ||
                          (!route.params?.slug && category.slug === 'all'),
                      },
                    ]"
                  >
                    {{ category.name }}
                  </NuxtLink>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels></v-col
      ><v-col>
        <v-expansion-panels variant="inset" class="my-4">
          <v-expansion-panel>
            <v-expansion-panel-title
              >Tags<span
                >: {{ selectedTagName || $t("pages.tags.index.title") }}</span
              ></v-expansion-panel-title
            >
            <v-expansion-panel-text>
              <v-row no-gutters>
                <v-col
                  v-for="tag in tags"
                  :key="tag.slug"
                  cols="auto"
                  class="my-1 mx-3"
                >
                  <NuxtLink
                    :to="
                      tag.slug === 'all'
                        ? localPath('/tags')
                        : localPath(`/tags/${tag.slug}`)
                    "
                    :class="[
                      'text-decoration-none font-weight-medium',
                      {
                        'text-primary':
                          route.params?.slug === tag.slug ||
                          (!route.params?.slug && tag.slug === 'all'),
                      },
                    ]"
                  >
                    {{ tag.name }}
                  </NuxtLink>
                </v-col>
              </v-row>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-col></v-row
    >

    <!-- Articles List -->
    <v-row dense>
      <v-col
        v-for="article in paginatedArticles"
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
import { useI18n } from "vue-i18n";
const localPath = useLocalePath();
const route = useRoute();
const { getAllPublishedArticlesWithTags, getAllTags, getAllCategories } =
  useDb();
const authStore = useAuthStore();
const { t } = useI18n();
const userProfile = ref(null);
const isLoading = ref(true);
const searchQuery = ref("");
const searchLabel = computed(() => t("pages.articles.index.search"));
const articles = ref([]);
const tags = ref([]);
const categories = ref([]);
const currentPage = ref(1);
const perPage = 10;

// Filter and paginate articles
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

// Selected display names for UI
const selectedTagName = computed(() => {
  const slug = route.params?.slug;
  return tags.value.find((t) => t.slug === slug)?.name || null;
});

const selectedCategoriesName = computed(() => {
  const slug = route.params?.slug;
  return categories.value.find((c) => c.slug === slug)?.name || null;
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

  const [articleData, tagData, categoryData] = await Promise.all([
    getAllPublishedArticlesWithTags(),
    getAllTags(),
    getAllCategories(),
  ]);

  articles.value = articleData || [];
  tags.value = tagData || [];
  categories.value = categoryData || [];
  isLoading.value = false;
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
</style>
