<template>
  <v-container class="py-8" v-if="article" fluid>
    <PageHeader :text="displayTitle" />

    <v-row>
      <v-col>
        <FilterExpansion
          :title="$t('pages.categories.index.title')"
          :items="categories"
          base-path="/categories"
          :active-slugs="categorySlugs"
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
          :active-slugs="tagSlugs"
          panels-class="compact-panel"
          variant="inset"
        >
          <template #title="{ selectedName, title }">
            <span>Tags: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>
      </v-col>
    </v-row>

    <v-row v-if="heroImage">
      <v-img
        class="text-white"
        height="350"
        :src="heroImage"
        cover
      >
        <div
          class="d-flex justify-space-between align-center px-4 pb-3"
          style="position: absolute; bottom: 0; left: 0; right: 0"
        >
          <v-btn
            color="primary"
            :to="localPath('/chat/articles/' + encodeURIComponent(chatThreadKey || ''))"
            :disabled="!chatThreadKey"
            large
          >
            {{
              chatThreadKey
                ? $t("pages.home.landing_page.cta_button")
                : "No open chats"
            }}
            <v-icon end>mdi-chat</v-icon>
          </v-btn>

          <span class="text-body-2">{{ formatDate(article.created_at) }}</span>
        </div>
      </v-img>
    </v-row>

    <v-row v-if="displaySummary">
      <v-col cols="12">
        <v-alert type="info" variant="tonal" border="start" class="mb-2">
          {{ displaySummary }}
        </v-alert>
      </v-col>
    </v-row>

    <v-row v-if="personaName || personaAvatar">
      <v-col cols="12">
        <v-card class="pa-4" elevation="2">
          <div class="d-flex align-center ga-4">
            <v-avatar v-if="personaAvatar" size="52">
              <v-img :src="personaAvatar" :alt="personaName" />
            </v-avatar>
            <div class="d-flex flex-column">
              <span class="text-caption text-medium-emphasis">Perspective</span>
              <span class="text-subtitle-1 font-weight-medium">
                {{ personaName }}
              </span>
              <span v-if="rewriteHeadline" class="text-body-2 text-medium-emphasis">
                {{ rewriteHeadline }}
              </span>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row v-if="newsmeshMeta">
      <v-col cols="12">
        <v-card class="pa-4 mb-4" elevation="1">
          <div class="d-flex flex-wrap ga-2">
            <v-chip v-if="newsmeshMeta.stream" size="small" color="primary" variant="tonal">
              Stream: {{ newsmeshMeta.stream }}
            </v-chip>
            <v-chip v-if="newsmeshMeta.category" size="small" color="indigo" variant="tonal">
              Category: {{ newsmeshMeta.category }}
            </v-chip>
            <v-chip v-if="newsmeshMeta.published_date" size="small" variant="tonal">
              Published: {{ formatDate(newsmeshMeta.published_date) }}
            </v-chip>
            <v-chip v-if="newsmeshMeta.source" size="small" variant="outlined">
              Source: {{ newsmeshMeta.source }}
            </v-chip>
            <v-chip
              v-for="topic in newsmeshTopics"
              :key="`topic-${topic}`"
              size="small"
              color="deep-purple"
              variant="tonal"
            >
              {{ topic }}
            </v-chip>
            <v-chip
              v-for="person in newsmeshPeople"
              :key="`person-${person}`"
              size="small"
              color="teal"
              variant="tonal"
            >
              {{ person }}
            </v-chip>
          </div>
          <div class="mt-3" v-if="newsmeshMeta.link">
            <v-btn
              :href="newsmeshMeta.link"
              target="_blank"
              rel="noopener noreferrer"
              variant="text"
              prepend-icon="mdi-link"
            >
              Original source
            </v-btn>
          </div>
        </v-card>
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
            :to="localPath(`/categories/${article.category.slug}`)"
            class="ml-1 unstyled-link"
          >
            {{ article.category.name }}
          </NuxtLink>
        </div>

        <!-- Render Markdown content -->
        <div class="prose" v-html="renderedMarkdown"></div>

        <div v-if="rewriteReferences.length" class="mt-6">
          <h3 class="text-subtitle-1 mb-2">References</h3>
          <ul>
            <li v-for="ref in rewriteReferences" :key="ref.label + (ref.url || '')">
              <a
                v-if="ref.url"
                :href="ref.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                {{ ref.label }}
              </a>
              <template v-else>{{ ref.label }}</template>
            </li>
          </ul>
        </div>
      </v-col>
    </v-row>

    <v-row justify="center" class="mb-4">
      <v-col cols="12" class="text-center">


      </v-col>
    </v-row>

    <v-row justify="center">
      <v-col cols="12" md="8" class="text-center">
        <div class="d-flex justify-center align-center flex-wrap">
          <span class="font-weight-medium mr-2">
            {{ $t("pages.admin.sections.tags") }}:
          </span>
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

    <!-- <v-row>
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
    </v-row> -->
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

const chatThreadKey = ref(null);

const {
  getArticleBySlug,
  getAllCategories,
  getAllTags,
  getThreadKeyByArticleId,
} = useDb();

const { data: article, error } = await useAsyncData(`article-${slug}`, () =>
  getArticleBySlug(slug)
);

const categories = ref([]);
const tags = ref([]);

const categorySlugs = computed(() => {
  const a = article.value;
  if (!a) return [];
  // support single category or an array
  const single = a.category?.slug ? [a.category.slug] : [];
  const many = Array.isArray(a.categories)
    ? a.categories.map((c) => c?.slug).filter(Boolean)
    : [];
  return [...new Set([...single, ...many])];
});

const tagSlugs = computed(() => {
  const a = article.value;
  if (!a) return [];
  const list = Array.isArray(a.tags)
    ? a.tags
    : Array.isArray(a.article_tags)
    ? a.article_tags
    : [];
  return [...new Set(list.map((t) => t?.slug).filter(Boolean))];
});

const newsmeshMeta = computed(() => article.value?.newsmesh_meta || null);
const rewriteMeta = computed(() => article.value?.rewrite_meta || null);
const rewriteHeadline = computed(() => rewriteMeta.value?.headline || null);
const personaName = computed(
  () =>
    article.value?.persona_display_name ||
    rewriteMeta.value?.persona_display_name ||
    article.value?.persona_key ||
    ""
);
const personaAvatar = computed(
  () =>
    article.value?.persona_avatar_url ||
    rewriteMeta.value?.persona_avatar_url ||
    null
);

const newsmeshTopics = computed(() => newsmeshMeta.value?.topics || []);
const newsmeshPeople = computed(() => newsmeshMeta.value?.people || []);
const displayTitle = computed(
  () => newsmeshMeta.value?.title || article.value?.title || ""
);
const displaySummary = computed(
  () =>
    newsmeshMeta.value?.summary ||
    rewriteMeta.value?.summary ||
    article.value?.summary ||
    ""
);

const heroImage = computed(() => {
  if (article.value?.image_path) {
    return `${config.public.SUPABASE_BUCKET}/articles/${article.value.image_path}`;
  }
  if (newsmeshMeta.value?.media_url) {
    return newsmeshMeta.value.media_url;
  }
  return null;
});

const rewriteReferences = computed(() => rewriteMeta.value?.references || []);

const renderedMarkdown = ref("");

let htmlContent = "";
if (article.value?.content) {
  htmlContent = article.value.content;
} else if (rewriteMeta.value?.body) {
  htmlContent = await marked(rewriteMeta.value.body);
}

if (htmlContent) {
  renderedMarkdown.value = htmlContent;

  const plainText = htmlContent.replace(/<[^>]+>/g, " ");
  const condensed = plainText.replace(/\s+/g, " ").trim();
  const safeDescription = condensed
    ? condensed.slice(0, 160) + "…"
    : displayTitle.value;
  const localizedShareUrl = `https://imchatty.com${
    currentLocale === "en" ? "" : `/${currentLocale}`
  }/articles/${slug}`;
  const imageUrl = heroImage.value;

  onMounted(async () => {
    if (article.value?.id) {
      chatThreadKey.value = await getThreadKeyByArticleId(article.value.id);
    }
    const [categoryData, tagData] = await Promise.all([
      getAllCategories(),
      getAllTags(),
    ]);

    categories.value = categoryData || [];
    tags.value = tagData || [];
  });

  useHead({
    link: [
      {
        rel: "canonical",
        href: localizedShareUrl,
      },
    ],
  });

  useSeoMeta({
    title: `${displayTitle.value} – ImChatty`,
    description: safeDescription,
    ogTitle: `${displayTitle.value} – ImChatty`,
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
    twitterTitle: `${displayTitle.value} – ImChatty`,
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
