<template>
  <v-container fluid>
    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>
      <!-- <HomeRow1 /> -->

      <PageHeader
        :text="tagHeading"
        :subtitle="tagSubtitle"
      />

      <!--     <v-row>
      <v-col>
          <h1>{{ formattedSlug }}</h1>
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
      </v-row>-->

      <v-row>
        <v-col>
          <!-- Categories: neutral on tag detail page -->
          <FilterExpansion
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
        </v-col>

        <v-col>
          <!-- Tags: highlight the current tag slug from the route -->
          <FilterExpansion
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
        </v-col>

        <v-col>
          <FilterExpansion
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
        </v-col>
      </v-row>

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

      <!-- No Articles Found -->
      <v-row v-if="!filteredArticles.length" justify="center">
        <v-col class="text-center">
          <p>{{ $t("pages.tags.slug.no-articles") }}</p>
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
import { useI18n } from "vue-i18n";
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta"; // adjust path as needed

const {
  getArticlesByTagSlug,
  getTagsByArticle,
  getAllCategories,
  getAllTags,
  getAllPeople,
} = useDb();

const { t, te } = useI18n();
const route = useRoute();
const config = useRuntimeConfig();
const supabaseBucket = config.public.SUPABASE_BUCKET;

const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const people = ref([]);
const searchQuery = ref("");
const tagSlug = computed(() => route.params.slug);

const perPage = 12;
const visibleCount = ref(perPage);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const tagName = computed(() =>
  tagSlug.value.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
);

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

// Image + SEO setup
const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;

const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";
  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  return raw
    ? raw.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "";
});

const tagHeading = computed(
  () => tagName.value || t("pages.articles.tags.heading")
);
const tagSubtitle = computed(() => t("pages.articles.tags.subtitle"));

useSeoI18nMeta("tags.index", {
  dynamic: {
    title: tagHeading,
    description: computed(() =>
      getLimitedDescription(`Browse articles tagged under ${tagName.value}.`)
    ),
    ogTitle: tagHeading,
    ogDescription: computed(() =>
      getLimitedDescription(
        `Insights and resources categorized under ${tagName.value}.`
      )
    ),
    ogImage: firstImage,
    twitterTitle: tagHeading,
    twitterDescription: computed(() =>
      getLimitedDescription(`Curated content about ${tagName.value}.`)
    ),
    twitterImage: firstImage,
  },
});

const { data: initialData, pending } = await useAsyncData(
  () => `tag-page-${tagSlug.value}`,
  async () => {
    const [categoryData, tagData, peopleData, data] = await Promise.all([
      getAllCategories(),
      getAllTags(),
      getAllPeople(),
      getArticlesByTagSlug(tagSlug.value),
    ]);

    let articlesWithTags = [];
    if (data) {
      articlesWithTags = await Promise.all(
        data.map(async (article) => ({
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
  { watch: [tagSlug] }
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
