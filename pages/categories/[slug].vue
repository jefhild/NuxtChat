<template>
  <v-container>
    <v-row justify="center">
      <v-col cols="12" md="8">
        <h1>{{ route.params.slug.replaceAll("-", " ").toUpperCase() }}</h1>
      </v-col>
    </v-row>

    <LoadingContainer v-if="isLoading" :text="$t('pages.articles.index.loading')" />

    <v-container v-else>
      <v-row>
        <v-col v-for="article in articles" :key="article.id" cols="12" sm="6" md="4" class="d-flex">
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
const formattedSlug = computed(() => {
  const raw = route.params.slug;
  if (!raw) return "";
  return raw.replaceAll("-", " ").replace(/\b\w/g, (l) => l.toUpperCase());
});

const isLoading = ref(true);
const articles = ref([]);

onMounted(async () => {
  const data = await getArticlesbyCategorySlug(route.params.slug);
  if (data) {
    const articlesWithTags = await Promise.all(
      data.map(async (article) => ({
        ...article,
        tags: await getTagsByArticle(article.slug),
      }))
    );

    articles.value = articlesWithTags;
  }
  isLoading.value = false;
});

const articlesSeo = computed(() => t("pages.categories.slug.meta.articles"));
const seoDescription = computed(() => t("pages.categories.slug.meta.description1") + "\"" + formattedSlug.value.toLowerCase() + "\"" + t("pages.categories.slug.meta.description2"));
const ogDescription = computed(() =>
  t("pages.categories.slug.meta.ogDescription1") + "\"" + formattedSlug.value.toLowerCase() + "\"" + t("pages.categories.slug.meta.ogDescription2")
);
const twitterDescription = computed(() =>
  t("pages.categories.slug.meta.twitterDescription1") + "\"" + formattedSlug.value.toLowerCase() + "\"" + t("pages.categories.slug.meta.twitterDescription2")
);

useSeoMeta({
  title: computed(() => `${formattedSlug.value} ${articlesSeo.value} – ImChatty`),
  description: seoDescription,
  ogTitle: computed(() => `${formattedSlug.value} ${articlesSeo.value} – ImChatty`),
  ogDescription: ogDescription,
  twitterTitle: computed(() => `${formattedSlug.value} Articles`),
  twitterDescription: twitterDescription,
});
</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 10px;
  padding: 20px;
  background-image: url("/images/bkg/tiedie2.webp");
  background-position: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: black;
  margin-bottom: 1.5rem;
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
</style>
