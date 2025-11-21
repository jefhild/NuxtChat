<template>
  <v-container fluid>
    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>
      <PageHeader :text="pageHeading" :subtitle="pageSubtitle" />

      <v-row>
        <v-col>
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
          <FilterExpansion
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
        </v-col>

        <v-col>
          <FilterExpansion
            :title="$t('pages.people.index.title')"
            :items="people"
            base-path="/people"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            variant="inset"
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
const isLoading = ref(true);
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

const pageHeading = computed(() =>
  t("pages.people.slug.heading", { name: displayName.value })
);
const pageSubtitle = computed(() =>
  t("pages.people.slug.subtitle", { name: displayName.value })
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

const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";
  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

const limitedDescription = computed(() =>
  t("pages.people.slug.metaDescription", { name: displayName.value })
);

useSeoMeta({
  title: computed(() => `${pageHeading.value} – ImChatty`),
  description: limitedDescription,
  ogTitle: computed(() => `${pageHeading.value} – ImChatty`),
  ogDescription: limitedDescription,
  ogImage: firstImage,
  twitterTitle: computed(() => `${pageHeading.value} – ImChatty`),
  twitterDescription: limitedDescription,
  twitterImage: firstImage,
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
  isLoading.value = true;

  const [categoryData, tagData, peopleData, personResult] = await Promise.all([
    getAllCategories(),
    getAllTags(),
    getAllPeople(),
    getArticlesByPersonSlug(route.params.slug),
  ]);

  categories.value = categoryData || [];
  tags.value = tagData || [];
  people.value = peopleData || [];
  person.value = personResult.person;

  if (personResult.articles?.length) {
    const articlesWithTags = await Promise.all(
      personResult.articles.map(async (article) => ({
        ...article,
        tags: await getTagsByArticle(article.slug),
      }))
    );
    articles.value = articlesWithTags;
  } else {
    articles.value = [];
  }

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
