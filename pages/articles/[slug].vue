<template>
  <v-container class="py-8" v-if="article">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <h1>{{ article.title }}</h1>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">
        <div class="text-body-2 text-grey-darken-1 mb-4">
          <v-icon>mdi-account</v-icon>
          <span class="ml-1">{{ $t("components.navbar.imchatty") }}</span>
          •
          <v-icon>mdi-folder</v-icon>
          <NuxtLink
            :to="`/categories/${article.category.slug}`"
            class="ml-1 unstyled-link"
          >
            {{ article.category.name }}
          </NuxtLink>
          •
          <v-icon>mdi-calendar-blank</v-icon>
          <span class="ml-1">{{ formatDate(article.created_at) }}</span>
        </div>

        <!-- Render Markdown content -->
        <div class="prose" v-html="renderedMarkdown"></div>
      </v-col>
    </v-row>

    <v-row class="ml-2 mt-10">
      <v-col cols="12" md="4">
        <v-btn color="primary" to="/chat">
          {{ $t("pages.home.landing_page.cta_button") }}!
          <v-icon end>mdi-chat</v-icon>
        </v-btn>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="8">
        <div class="d-flex align-center flex-wrap">
          <span class="font-weight-medium mr-2">{{ $t("pages.admin.sections.tags") }}:</span>
          <v-chip
            v-for="tag in article.tags"
            :key="tag.id"
            class="ma-1"
            color="deep-purple-lighten-2"
            size="small"
            variant="outlined"
            :to="`/tags/${tag.slug}`"
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

  <v-container v-else class="py-12 text-center">
    <v-progress-circular indeterminate color="primary"></v-progress-circular>
  </v-container>
</template>

<script setup>
import { marked } from "marked"; // or use @nuxt/content if preferred

const authStore = useAuthStore();
const route = useRoute();
const slug = route.params.slug;

const article = ref(null);
const renderedMarkdown = ref("");
const shareUrl = `https://imchatty.com/articles/${slug}`;

const { getArticleBySlug } = useDb(); // You'd need to define this helper

onMounted(async () =>
{
  authStore.checkAuth();
  const data = await getArticleBySlug(slug);
  if (data)
  {
    article.value = data;

    const markdown = (data.content || "").replace(/\\n/g, "\n");

    renderedMarkdown.value = await marked(markdown); // Convert Markdown to HTML
  }
});

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

watchEffect(() =>
{
  if (!article.value) return;

  // To not have the html content when i use article.value.content in the SEO meta
  const plainText = article.value.content?.replace(/<[^>]+>/g, '') || '';
  const safeDescription = plainText.trim().slice(0, 160) + '…';


  useSeoMeta({
    title: `${article.value.title} – ImChatty`,
    description: safeDescription,
    ogTitle: `${article.value.title} – ImChatty`,
    ogDescription: safeDescription,
    ogUrl: shareUrl,
    ogImage: 'https://imchatty.com/images/article-image.webp',
    ogType: 'article',
    ogLocale: 'en_US',
    ogSiteName: 'ImChatty',
    twitterCard: 'summary_large_image',
    twitterTitle: `${article.value.title} – ImChatty`,
    twitterDescription: safeDescription,
    twitterImage: 'https://imchatty.com/images/article-image.webp',
    articleSection: article.value.category?.name || 'Article',
    articlePublishedTime: article.value.created_at,
    canonical: shareUrl
  });
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
  max-width: 750px;
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
