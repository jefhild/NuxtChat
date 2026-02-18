<template>
  <v-container class="filters-shell" fluid>
    <div class="filters-header-shell">
      <div class="filters-header-actions">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          class="filters-menu-btn"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader :text="pageHeading" :subtitle="pageSubtitle" />
    </div>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="360"
      :style="filtersDrawerStyle"
      class="filters-drawer"
      aria-label="People filters"
    >
      <v-list density="compact" class="filters-drawer-list">
        <v-list-subheader>{{ $t("pages.articles.index.filters") }}</v-list-subheader>
        <div class="filters-drawer-title px-3 pb-2">
          {{ pageHeading }}
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
            :selected-slug="null"
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
      </v-list>
    </v-navigation-drawer>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>

      <v-row>
        <v-col
          v-for="article in visibleArticles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <ArticleCard
            :article="article"
            :chatThreadId="article.thread_slug ?? undefined"
          />
        </v-col>
      </v-row>

      <v-row v-if="!filteredArticles.length" justify="center">
        <v-col class="text-center">
          <p>
            {{
              $t("pages.people.slug.no-articles", {
                name: displayName,
              })
            }}
          </p>
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
const config = useRuntimeConfig();
const supabaseBucket = config.public.SUPABASE_BUCKET;

const {
  getArticlesByPersonSlug,
  getTagsByArticle,
  getAllCategories,
  getAllTags,
  getAllPeople,
} = useDb();

const person = ref(null);
const categories = ref([]);
const tags = ref([]);
const people = ref([]);
const articles = ref([]);
const openFilterPanel = ref(null);
const filtersOpen = ref(false);
const filtersDrawerStyle = { zIndex: 1004, transition: "none !important" };
const slug = computed(() => route.params.slug);
const searchQuery = ref("");
const perPage = 12;
const visibleCount = ref(perPage);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  return raw
    ? raw
        .toString()
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";
});

const displayName = computed(
  () => person.value?.name || formattedSlug.value || t("pages.people.index.title")
);

const pageHeading = computed(
  () => displayName.value || t("pages.people.index.title")
);
const pageSubtitle = computed(() => t("pages.people.index.subtitle"));

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

const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";
  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

const limitedDescription = computed(() =>
  t("pages.people.slug.metaDescription", { name: displayName.value })
);

useSeoI18nMeta("people.index", {
  dynamic: {
    title: computed(() => `${pageHeading.value} – ImChatty`),
    description: limitedDescription,
    ogTitle: computed(() => `${pageHeading.value} – ImChatty`),
    ogDescription: limitedDescription,
    ogImage: firstImage,
    twitterTitle: computed(() => `${pageHeading.value} – ImChatty`),
    twitterDescription: limitedDescription,
    twitterImage: firstImage,
  },
});

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

const { data: initialData, pending } = await useAsyncData(
  () => `person-page-${slug.value}`,
  async () => {
    const [categoryData, tagData, peopleData, personResult] = await Promise.all(
      [
        getAllCategories(),
        getAllTags(),
        getAllPeople(),
        getArticlesByPersonSlug(slug.value),
      ]
    );

    let articlesWithTags = [];
    if (personResult?.articles?.length) {
      articlesWithTags = await Promise.all(
        personResult.articles.map(async (article) => ({
          ...article,
          tags: await getTagsByArticle(article.slug),
        }))
      );
    }

    return {
      categories: categoryData || [],
      tags: tagData || [],
      people: peopleData || [],
      person: personResult?.person || null,
      articles: articlesWithTags,
    };
  },
  { watch: [slug], server: true }
);

watchEffect(() => {
  if (!initialData.value) return;
  categories.value = initialData.value.categories || [];
  tags.value = initialData.value.tags || [];
  people.value = initialData.value.people || [];
  person.value = initialData.value.person || null;
  articles.value = initialData.value.articles || [];
});

const isLoading = computed(() => pending.value);
</script>

<style scoped>
.filters-shell {
  padding-top: 6px;
}

.filters-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.filters-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.filters-menu-btn {
  margin: 0;
}

.filters-header-shell :deep(.page-header-row) {
  padding-left: 52px;
  box-sizing: border-box;
}

.filters-drawer {
  margin-top: 64px;
  height: calc(100% - 64px);
  overflow: hidden;
}

.filters-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.filters-drawer-title {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
