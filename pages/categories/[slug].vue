<template>
  <v-container fluid>
    <HomeRow1 />
    <v-row align="center" justify="space-between" class="">
      <v-col cols="12" md="6">
        <h1>{{ route.params.slug.replaceAll("-", " ").toUpperCase() }}</h1>
      </v-col>
    </v-row>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>
      <ArticleSearchFilters
        v-if="categories.length || tags.length"
        :categories="categories"
        :tags="tags"
        v-model:searchQuery="searchQuery"
        :searchLabel="searchArticlesLabel"
        @categorySelected="goToCategory"
        @tagSelected="goToTag"
      />
      <v-row>
        <v-col
          v-for="article in articles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <ArticleCard :article="article" />
        </v-col>
      </v-row>

      <v-row v-if="!articles.length">
        <v-col class="text-center">
          <p>{{ $t("pages.categories.slug.no-articles") }}</p>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { getArticlesbyCategorySlug, getTagsByArticle } = useDb();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  if (!raw) return "";
  return raw.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
});

const isLoading = ref(true);
const articles = ref([]);

const searchQuery = ref("");
const { getAllCategories, getAllTags } = useDb(); // Add this
const categories = ref([]);
const tags = ref([]); // optional – fetch if needed
const searchArticlesLabel = computed(() => t("pages.articles.index.search"));

const goToTag = (slug) => {
  if (slug) router.push(localPath(`/tags/${slug}`));
};

const goToCategory = (slug) => {
  if (slug) router.push(localPath(`/categories/${slug}`));
};

onMounted(async () => {
  // Load categories for the dropdown
  categories.value = await getAllCategories();

  // Load articles by category slug
  const data = await getArticlesbyCategorySlug(route.params.slug);
  if (data) {
    const articlesWithTags = await Promise.all(
      data.map(async (article) => ({
        ...article,
        tags: await getTagsByArticle(article.slug),
      }))
    );

    articles.value = articlesWithTags;

    // Deduplicate tags using slug as the key
    const tagMap = new Map();
    for (const article of articlesWithTags) {
      article.tags.forEach((tag) => {
        tagMap.set(tag.slug, tag);
      });
    }
    tags.value = Array.from(tagMap.values());
  }

  isLoading.value = false;
});

const articlesSeo = computed(() => t("pages.categories.slug.meta.articles"));
const seoDescription = computed(
  () =>
    t("pages.categories.slug.meta.description1") +
    '"' +
    formattedSlug.value.toLowerCase() +
    '"' +
    t("pages.categories.slug.meta.description2")
);
const ogDescription = computed(
  () =>
    t("pages.categories.slug.meta.ogDescription1") +
    '"' +
    formattedSlug.value.toLowerCase() +
    '"' +
    t("pages.categories.slug.meta.ogDescription2")
);
const twitterDescription = computed(
  () =>
    t("pages.categories.slug.meta.twitterDescription1") +
    '"' +
    formattedSlug.value.toLowerCase() +
    '"' +
    t("pages.categories.slug.meta.twitterDescription2")
);

useSeoMeta({
  title: computed(
    () => `${formattedSlug.value} ${articlesSeo.value} – ImChatty`
  ),
  description: seoDescription,
  ogTitle: computed(
    () => `${formattedSlug.value} ${articlesSeo.value} – ImChatty`
  ),
  ogDescription: ogDescription,
  twitterTitle: computed(() => `${formattedSlug.value} Articles`),
  twitterDescription: twitterDescription,
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
</style>
