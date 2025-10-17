<template>
  <v-container fluid>
    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>
      <!-- <HomeRow1 /> -->

      <PageHeader
        :text="
          t(
            `pages.tags.${route.params.slug}.heading`,
            t('pages.articles.tags.heading')
          )
        "
        :subtitle="
          t(
            `pages.tags.${route.params.slug}.subtitle`,
            t('pages.articles.tags.subtitle')
          )
        "
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
          <!-- Categories: neutral on tag detail page -->
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
          <!-- Tags: highlight the current tag slug from the route -->
          <FilterExpansion
            :title="$t('pages.tags.index.title')"
            :items="tags"
            base-path="/tags"
            :selected-slug="route.params?.slug || null"
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
          v-for="article in paginatedArticles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <ArticleCard :article="article" />
        </v-col>
      </v-row>

      <!-- No Articles Found -->
      <v-row v-if="!filteredArticles.length" justify="center">
        <v-col class="text-center">
          <p>{{ $t("pages.tags.slug.no-articles") }}</p>
        </v-col>
      </v-row>

      <!-- Pagination Controls -->
      <v-row justify="center" class="mt-8">
        <v-pagination
          v-model="currentPage"
          :length="pageCount"
          color="primary"
        />
      </v-row>
    </v-container>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta"; // adjust path as needed

const { getArticlesByTagSlug, getTagsByArticle, getAllCategories, getAllTags } =
  useDb();

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const localPath = useLocalePath();
const config = useRuntimeConfig();
const supabaseBucket = config.public.SUPABASE_BUCKET;

const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const searchQuery = ref("");
const isLoading = ref(true);

const currentPage = ref(1);
const perPage = 10;

const tagSlug = computed(() => route.params.slug);

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

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * perPage;
  return filteredArticles.value.slice(start, start + perPage);
});

const pageCount = computed(() =>
  Math.ceil(filteredArticles.value.length / perPage)
);

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

// Data fetch
onMounted(async () => {
  isLoading.value = true;

  const [categoryData, tagData, data] = await Promise.all([
    getAllCategories(),
    getAllTags(),
    getArticlesByTagSlug(tagSlug.value),
  ]);

  categories.value = categoryData || [];
  tags.value = tagData || [];

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
