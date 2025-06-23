<template>
  <v-container class="py-8" v-if="article" fluid>
    <HomeRow1 />
    <v-row>
      <v-img
        class="align-end text-white"
        height="350"
        :src="`${config.public.SUPABASE_BUCKET}/articles/${article.image_path}`"
        cover
      >
        <div class="w-100 text-center px-4">
          <div
            class="font-weight-bold text-subtitle-1 text-md-h5 text-lg-h4"
            style="white-space: normal; word-break: break-word"
          >
            {{ article.title }}
          </div>
        </div>
        <div class="d-flex justify-end pr-4 pb-2">
          <span class="ml-1">{{ formatDate(article.created_at) }}</span>
        </div>
      </v-img>
    </v-row>

    <!-- <v-row justify="center">
      <v-col cols="12" md="8">
        <h1>{{ article.title }}</h1>
      </v-col>
    </v-row> -->

    <v-row>
      <v-col cols="12">
        <div class="text-body-2 text-grey-darken-1 mb-4">
          <v-icon>mdi-account</v-icon>
          <span class="ml-1">{{ $t("components.navbar.imchatty") }}</span>
          •
          <v-icon>mdi-folder</v-icon>
          <NuxtLink
            :to="localPath(`/categories/${article.category.slug}`)"
            class="ml-1 unstyled-link"
          >
            {{ article.category.name }}
          </NuxtLink>
        </div>

        <!-- Render Markdown content -->
        <div class="prose" v-html="renderedMarkdown"></div>
      </v-col>
    </v-row>

    <v-row class="ml-2 mt-10">
      <v-col cols="12" md="4">
        <v-btn color="primary" :to="localPath('/chat')">
          {{ $t("pages.home.landing_page.cta_button") }}!
          <v-icon end>mdi-chat</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <div class="d-flex align-center flex-wrap">
          <span class="font-weight-medium mr-2"
            >{{ $t("pages.admin.sections.tags") }}:</span
          >
          <v-chip
            v-for="tag in article.tags"
            :key="tag.id"
            class="ma-1"
            color="deep-purple-lighten-2"
            size="small"
            variant="outlined"
            :to="localPath(`/tags/${tag.slug}`)"
          >
            #{{ tag.name }}
          </v-chip>
        </div>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" class="text-center">
        <h3 class="">Share</h3>

        <div class="d-inline-flex align-center justify-center">
          <v-btn
            class="ma-2 share-btn"
            color="primary"
            :href="`https://twitter.com/intent/tweet?url=${shareUrl}`"
            target="_blank"
            icon
          >
            <v-icon>mdi-twitter</v-icon>
          </v-btn>
          <v-btn
            class="ma-2 share-btn"
            color="primary"
            :href="`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`"
            target="_blank"
            icon
          >
            <v-icon>mdi-facebook</v-icon>
          </v-btn>
          <v-btn
            class="ma-2 share-btn"
            color="primary"
            :href="`mailto:?subject=${article.title}&body=${shareUrl}`"
            icon
          >
            <v-icon>mdi-email</v-icon>
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </v-container>

  <LoadingContainer v-else />
</template>

<script setup>
import { marked } from "marked";
const { locale } = useI18n();
const localPath = useLocalePath();
const config = useRuntimeConfig();
const route = useRoute();
const slug = route.params.slug;
const currentLocale = locale.value || "en";
const shareUrl = `https://imchatty.com/${currentLocale}/articles/${slug}`;
const { getArticleBySlug } = useDb();

const { data: article, error } = await useAsyncData(`article-${slug}`, () =>
  getArticleBySlug(slug)
);

const renderedMarkdown = ref("");

if (article.value?.content) {
  const markdown = article.value.content.replace(/\\n/g, "\n");
  renderedMarkdown.value = await marked(markdown);

  const htmlContent = renderedMarkdown.value;
  const plainText = htmlContent.replace(/<[^>]+>/g, " ");
  const condensed = plainText.replace(/\s+/g, " ").trim();
  const safeDescription = condensed.slice(0, 160) + "…";
  const localizedShareUrl = `https://imchatty.com/${currentLocale}/articles/${slug}`;
  const imageUrl = `${config.public.SUPABASE_BUCKET}/articles/${article.value.image_path}`;

  useHead({
    link: [
      {
        rel: "canonical",
        href: localizedShareUrl,
      },
    ],
  });

  useSeoMeta({
    title: `${article.value.title} – ImChatty`,
    description: safeDescription,
    ogTitle: `${article.value.title} – ImChatty`,
    ogDescription: safeDescription,
    ogUrl: localizedShareUrl,
    ogImage: imageUrl,
    ogType: "article",
    ogLocale:
      currentLocale === "en"
        ? "en_US"
        : `${currentLocale}_${currentLocale.toUpperCase()}`,
    ogSiteName: "ImChatty",
    twitterCard: "summary_large_image",
    twitterTitle: `${article.value.title} – ImChatty`,
    twitterDescription: safeDescription,
    twitterImage: imageUrl,
    articleSection: article.value.category?.name || "Article",
    articlePublishedTime: article.value.created_at,
    canonical: localizedShareUrl,
  });
}

// Format date utility
const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
</script>

<style scoped>
.title-bar {
  border-radius: 20px;
  margin: 10px 0px;
  padding: 20px;
  background-image: url("/images/bkg/tiediebkg.webp");
  background-size: cover;
  background-position: center;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  color: black;
}

.page-title {
  font-family: "Poppins", sans-serif;
  font-weight: 700;
  font-size: 2.8rem;
  text-align: center;
  margin: 2.5rem 0;
}

.prose {
  max-width: 800px;
  margin: auto;
  line-height: 1.7;
  font-size: 1rem;
}

.unstyled-link {
  text-decoration: none;
  color: inherit;
  transition: color 0.2s ease;
}

.unstyled-link:hover {
  color: #3f51b5; /* or any highlight color */
}

.share-btn {
  color: #fff;
  border-radius: 8px;
  width: 48px;
  height: 48px;
  transition: background-color 0.3s ease;
}

.share-btn:hover {
  background-color: #333;
}
</style>
