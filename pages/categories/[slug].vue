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
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta"; // update path as needed

const { getArticlesbyCategorySlug, getTagsByArticle, getAllCategories } = useDb();
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();
const config = useRuntimeConfig();

const isLoading = ref(true);
const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const searchQuery = ref("");

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  return raw ? raw.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase()) : "";
});

const searchArticlesLabel = computed(() => t("pages.articles.index.search"));

const goToTag = (slug) => {
  if (slug) router.push(localPath(`/tags/${slug}`));
};

const goToCategory = (slug) => {
  if (slug) router.push(localPath(`/categories/${slug}`));
};

const supabaseBucket = config.public.SUPABASE_BUCKET;
const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";
  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

useSeoI18nMeta("categories.index", {
  dynamic: {
    title: computed(() => `${formattedSlug.value} ${t("pages.categories.slug.meta.articles")} – ImChatty`),
    description: computed(() =>
      `${t("pages.categories.slug.meta.description1")}"${formattedSlug.value.toLowerCase()}"${t("pages.categories.slug.meta.description2")}`
    ),
    ogTitle: computed(() => `${formattedSlug.value} ${t("pages.categories.slug.meta.articles")} – ImChatty`),
    ogDescription: computed(() =>
      `${t("pages.categories.slug.meta.ogDescription1")}"${formattedSlug.value.toLowerCase()}"${t("pages.categories.slug.meta.ogDescription2")}`
    ),
    ogImage: firstImage,
    twitterTitle: computed(() => `${formattedSlug.value} Articles`),
    twitterDescription: computed(() =>
      `${t("pages.categories.slug.meta.twitterDescription1")}"${formattedSlug.value.toLowerCase()}"${t("pages.categories.slug.meta.twitterDescription2")}`
    ),
    twitterImage: firstImage,
  },
});

onMounted(async () => {
  categories.value = await getAllCategories();

  const data = await getArticlesbyCategorySlug(route.params.slug);
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
