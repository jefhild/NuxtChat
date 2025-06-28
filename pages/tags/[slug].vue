<template>
  <v-container fluid>
    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container fluid v-else>
      <!-- ✅ Search + Dropdown Filters -->
      <!-- <ArticleSearchFilters
        v-if="categories.length || tags.length"
        :categories="categories"
        :tags="tags"
        v-model:searchQuery="searchQuery"
        :searchLabel="searchArticlesLabel"
        @categorySelected="goToCategory"
        @tagSelected="goToTag"
      /> -->

      <!-- <v-expansion-panels variant="inset" class="my-4">
        <v-expansion-panel>
          <v-expansion-panel-title>Tags<span>: {{ selectedTagName || $t('pages.tags.index.title') }}</span></v-expansion-panel-title>
          <v-expansion-panel-text>
            <v-row class="px-2">
              <v-col
                v-for="tag in tags"
                :key="tag.slug"
                cols="auto"
                class="my-1"
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
      </v-expansion-panels> -->
      <HomeRow1 />
      <v-row>
        <v-col>
          <h1>{{ route.params.slug.replaceAll("-", " ").toUpperCase() }}</h1>
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

const selectedTagName = computed(() => {
  const slug = route.params?.slug;
  return tags.value.find((t) => t.slug === slug)?.name || null;
});

const selectedCategoriesName = computed(() => {
  const slug = route.params?.slug;
  return categories.value.find((c) => c.slug === slug)?.name || null;
});

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
