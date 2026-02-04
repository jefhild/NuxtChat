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
      <PageHeader :text="categoryHeading" :subtitle="categorySubtitle" />
    </div>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="360"
      :style="filtersDrawerStyle"
      class="filters-drawer"
      aria-label="Category filters"
    >
      <v-list density="compact" class="filters-drawer-list">
        <v-list-subheader>{{ $t("pages.articles.index.filters") }}</v-list-subheader>
        <div class="filters-drawer-title px-3 pb-2">
          {{ categoryHeading }}
        </div>
        <v-divider />
        <div class="px-3 py-2 d-flex flex-column ga-3">
          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="categories"
            :title="$t('pages.categories.index.title')"
            :items="categories"
            base-path="/categories"
            :selected-slug="route.params?.slug || null"
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
            :selected-slug="null"
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

    <template v-else>
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

          <!-- <ArticleCard :article="article" /> -->
        </v-col>
      </v-row>

      <v-row v-if="!filteredArticles.length">
        <v-col class="text-center">
          <p>{{ $t("pages.categories.slug.no-articles") }}</p>
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
import { useI18n } from "vue-i18n";
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta";

const {
  getArticlesbyCategorySlug,
  getTagsByArticle,
  getAllCategories,
  getAllTags,
  getAllPeople,
} = useDb();

const { t } = useI18n();
const route = useRoute();
const config = useRuntimeConfig();
const slug = computed(() => route.params.slug);
const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const people = ref([]);
const searchQuery = ref("");
const openFilterPanel = ref(null);
const filtersOpen = ref(false);
const filtersDrawerStyle = { zIndex: 1004, transition: "none !important" };
const perPage = 12;
const visibleCount = ref(perPage);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  return raw
    ? raw.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "";
});

const categoryHeading = computed(
  () => formattedSlug.value || t("pages.articles.categories.heading")
);
const categorySubtitle = computed(() => t("pages.articles.categories.subtitle"));

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

const supabaseBucket = config.public.SUPABASE_BUCKET;
const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";
  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

// SEO setup
useSeoI18nMeta("categories.index", {
  dynamic: {
    title: computed(
      () =>
        `${formattedSlug.value} ${t(
          "pages.categories.slug.meta.articles"
        )} – ImChatty`
    ),
    description: computed(
      () =>
        `${t(
          "pages.categories.slug.meta.description1"
        )}"${formattedSlug.value.toLowerCase()}"${t(
          "pages.categories.slug.meta.description2"
        )}`
    ),
    ogTitle: computed(
      () =>
        `${formattedSlug.value} ${t(
          "pages.categories.slug.meta.articles"
        )} – ImChatty`
    ),
    ogDescription: computed(
      () =>
        `${t(
          "pages.categories.slug.meta.ogDescription1"
        )}"${formattedSlug.value.toLowerCase()}"${t(
          "pages.categories.slug.meta.ogDescription2"
        )}`
    ),
    ogImage: firstImage,
    twitterTitle: computed(() => `${formattedSlug.value} Articles`),
    twitterDescription: computed(
      () =>
        `${t(
          "pages.categories.slug.meta.twitterDescription1"
        )}"${formattedSlug.value.toLowerCase()}"${t(
          "pages.categories.slug.meta.twitterDescription2"
        )}`
    ),
    twitterImage: firstImage,
  },
});

const { data: initialData, pending } = await useAsyncData(
  () => `category-page-${slug.value}`,
  async () => {
    const [categoryData, tagData, peopleData, articleData] = await Promise.all([
      getAllCategories(),
      getAllTags(),
      getAllPeople(),
      getArticlesbyCategorySlug(slug.value),
    ]);

    let articlesWithTags = [];
    if (articleData) {
      articlesWithTags = await Promise.all(
        articleData.map(async (article) => ({
          ...article,
          tags: await getTagsByArticle(article.slug),
        }))
      );
    }

    const tagMap = new Map();
    for (const article of articlesWithTags) {
      (article.tags || []).forEach((tag) => tagMap.set(tag.slug, tag));
    }
    const flattenedTags = Array.from(tagMap.values());

    return {
      categories: categoryData || [],
      tags: flattenedTags.length ? flattenedTags : tagData || [],
      people: peopleData || [],
      articles: articlesWithTags,
    };
  },
  { watch: [slug], server: false }
);

watchEffect(() => {
  if (!initialData.value) return;
  categories.value = initialData.value.categories || [];
  tags.value = initialData.value.tags || [];
  people.value = initialData.value.people || [];
  articles.value = initialData.value.articles || [];
});

const isLoading = computed(() => pending.value);

onMounted(() => {
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

.page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 2.8rem;
  text-align: center;
  margin-top: 2rem;
  margin-bottom: 2.5rem;
  color: #1f1f1f;
}

.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
