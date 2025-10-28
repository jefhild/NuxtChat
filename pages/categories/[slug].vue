<template>
  <v-container fluid>
    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>
      <!-- <HomeRow1 /> -->
  <PageHeader
    :text="t(`pages.categories.${route.params.slug}.heading`, t('pages.articles.categories.heading'))"
    :subtitle="t(`pages.categories.${route.params.slug}.subtitle`, t('pages.articles.categories.subtitle'))"
  />

      <v-row>
        <!-- <v-col>
          <h1>{{ formattedSlug }}</h1>
        </v-col> -->
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

      <v-row>
        <v-col>
          <FilterExpansion
            :title="$t('pages.categories.index.title')"
            :items="categories"
            base-path="/categories"
            :selected-slug="route.params?.slug || null"
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
      </v-row>

      <v-row>
        <v-col
          v-for="article in articles"
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
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta";

const {
  getArticlesbyCategorySlug,
  getTagsByArticle,
  getAllCategories,
  getAllTags,
} = useDb();

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
const currentPage = ref(1);
const perPage = 10;

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  return raw
    ? raw.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase())
    : "";
});

const searchLabel = computed(() => t("pages.articles.index.search"));


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

onMounted(async () => {
  isLoading.value = true;

  const [categoryData, tagData, articleData] = await Promise.all([
    getAllCategories(),
    getAllTags(),
    getArticlesbyCategorySlug(route.params.slug),
  ]);

  categories.value = categoryData || [];
  tags.value = tagData || [];

  if (articleData) {
    const articlesWithTags = await Promise.all(
      articleData.map(async (article) => ({
        ...article,
        tags: await getTagsByArticle(article.slug),
      }))
    );

    articles.value = articlesWithTags;

    // Flatten tags into a unique set from the article content
    const tagMap = new Map();
    for (const article of articlesWithTags) {
      article.tags.forEach((tag) => tagMap.set(tag.slug, tag));
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
