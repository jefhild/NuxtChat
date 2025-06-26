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
      <!-- ✅ Search + Dropdown Filters -->
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
          v-for="article in filteredArticles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <ArticleCard :article="article" />
        </v-col>
      </v-row>

      <v-row v-if="!filteredArticles.length">
        <v-col class="text-center">
          <p>{{ $t("pages.tags.slug.no-articles") }}</p>
        </v-col>
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta"; // adjust path
const { t } = useI18n();
const searchArticlesLabel = computed(() => t("pages.articles.index.search"));
const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();
const config = useRuntimeConfig();
const supabaseBucket = config.public.SUPABASE_BUCKET;
const { getArticlesByTagSlug, getTagsByArticle, getAllCategories } = useDb();
const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const searchQuery = ref("");
const isLoading = ref(true);

const tagSlug = computed(() => route.params.slug);
const tagName = computed(() =>
  tagSlug.value.replaceAll("-", " ").toUpperCase()
);

const getLimitedDescription = (text) =>
  text && text.length > 160 ? text.slice(0, 157) + "..." : text;

const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";

  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

// ✅ Apply SEO meta using computed values
useSeoI18nMeta("tags.index", {
  dynamic: {
    title: tagName,
    description: computed(() =>
      getLimitedDescription(`Browse articles tagged under ${tagName.value}.`)
    ),
    ogTitle: tagName,
    ogDescription: computed(() =>
      getLimitedDescription(
        `Insights and resources categorized under ${tagName.value}.`
      )
    ),
    ogImage: firstImage,
    twitterTitle: tagName,
    twitterDescription: computed(() =>
      getLimitedDescription(`Curated content about ${tagName.value}.`)
    ),
    twitterImage: firstImage,
  },
});

// ✅ Functions
const goToTag = (slug) => {
  if (slug) router.push(localPath(`/tags/${slug}`));
};
const goToCategory = (slug) => {
  if (slug) router.push(localPath(`/categories/${slug}`));
};

const filteredArticles = computed(() => {
  if (!searchQuery.value) return articles.value;
  return articles.value.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

onMounted(async () => {
  categories.value = await getAllCategories();
  const data = await getArticlesByTagSlug(tagSlug.value);

  if (data) {
    const articlesWithTags = await Promise.all(
      data.map(async (article) => ({
        ...article,
        tags: await getTagsByArticle(article.slug),
      }))
    );

    articles.value = articlesWithTags;

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
