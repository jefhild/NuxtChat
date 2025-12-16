<template>
  <v-container class="py-8" v-if="article" fluid>
    <v-row class="align-center mb-2 ga-2">
      <v-col cols="auto" class="d-flex align-center">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </v-col>
      <v-col>
        <PageHeader :text="displayTitle" />
      </v-col>
    </v-row>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="360"
      :style="filtersDrawerStyle"
      class="filters-drawer"
      aria-label="Article filters"
    >
      <div class="d-flex align-center justify-space-between px-3 py-3">
        <span class="text-subtitle-1 font-weight-medium">
          {{ displayTitle }}
        </span>
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Close filters"
          @click="filtersOpen = false"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </div>
      <v-divider />
      <div class="px-3 py-2 d-flex flex-column ga-3">
        <FilterExpansion
          v-model="openFilterPanel"
          panel-key="categories"
          :title="$t('pages.categories.index.title')"
          :items="categories"
          base-path="/categories"
          :active-slugs="categorySlugs"
          panels-class="compact-panel"
          variant="inset"
          :scrolling-list="true"
        >
          <template #title="{ selectedName, title }">
            <span>Categories: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>

        <FilterExpansion
          v-model="openFilterPanel"
          panel-key="tags"
          :title="$t('pages.tags.index.title')"
          :items="tags"
          base-path="/tags"
          :active-slugs="tagSlugs"
          panels-class="compact-panel"
          variant="inset"
          :scrolling-list="true"
        >
          <template #title="{ selectedName, title }">
            <span>Tags: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>

        <FilterExpansion
          v-model="openFilterPanel"
          panel-key="people"
          :title="$t('pages.people.index.title')"
          :items="people"
          base-path="/people"
          :active-slugs="peopleSlugs"
          panels-class="compact-panel"
          variant="inset"
          :scrolling-list="true"
        >
          <template #title="{ selectedName, title }">
            <span>People: {{ selectedName || title }}</span>
          </template>
        </FilterExpansion>
      </div>
    </v-navigation-drawer>
    <v-row v-if="heroImage">
      <v-img
        class="text-white hero-image"
        height="350"
        :src="heroImage"
        :alt="heroImageAlt"
        cover
      >
        <div
          v-if="personaName || personaAvatar"
          class="hero-persona-card d-flex align-center ga-4"
        >
          <v-avatar v-if="personaAvatar" size="52">
            <v-img :src="personaAvatar" :alt="personaName" />
          </v-avatar>
          <div class="d-flex flex-column">
            <span class="text-caption text-medium-emphasis">Perspective</span>
            <span class="text-subtitle-1 font-weight-medium">
              {{ personaName }}
            </span>
            <span
              v-if="rewriteHeadline"
              class="text-body-2 text-medium-emphasis"
            >
              {{ rewriteHeadline }}
            </span>
          </div>
        </div>
        <div
          class="hero-image-footer d-flex justify-space-between align-center px-4 pb-3"
        >
          <v-btn
            color="primary"
            :to="
              localPath(
                '/chat/articles/' + encodeURIComponent(chatThreadKey || '')
              )
            "
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

          <span
            v-if="displayPhotoCredits"
            class="text-body-2 text-white text-right hero-photo-credit"
            v-html="displayPhotoCredits"
          />
          <span v-else class="text-body-2 hero-photo-credit">
            {{ formatDate(article.created_at) }}
          </span>
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

    <v-row v-if="newsmeshMeta">
      <v-col cols="12">
        <v-card class="pa-4 mb-4" elevation="1">
          <div class="d-flex flex-wrap ga-2">
            <v-chip
              v-if="displayPublishedDate"
              size="small"
              variant="tonal"
            >
              Published: {{ formatDate(displayPublishedDate) }}
            </v-chip>
            <v-chip
              v-if="displaySourceLabel"
              size="small"
              variant="outlined"
              :href="displaySourceLink || undefined"
              :target="displaySourceLink ? '_blank' : undefined"
              :rel="displaySourceLink ? 'noopener noreferrer' : undefined"
            >
              Source: {{ displaySourceLabel }}
            </v-chip>
            <v-chip
              v-if="displayCategory"
              size="small"
              color="indigo"
              variant="tonal"
              :to="
                displayCategory.slug
                  ? localPath(`/categories/${displayCategory.slug}`)
                  : undefined
              "
              :class="{ 'chip-link': displayCategory.slug }"
            >
              Category: {{ displayCategory.name }}
            </v-chip>
            <v-chip
              v-for="tag in displayTags"
              :key="`topic-${tag.slug || tag.name}`"
              size="small"
              color="deep-purple"
              variant="tonal"
              :to="tag.slug ? localPath(`/tags/${tag.slug}`) : undefined"
              :class="{ 'chip-link': tag.slug }"
            >
              #{{ tag.name }}
            </v-chip>
            <template
              v-for="person in resolvedDisplayPeople"
              :key="`person-${person.slug || person.name}`"
            >
              <NuxtLink
                v-if="person.slug"
                :to="localPath(`/people/${person.slug}`)"
                class="unstyled-link"
              >
                <v-chip
                  size="small"
                  color="teal"
                  variant="tonal"
                  class="chip-link"
                >
                  {{ person.name }}
                </v-chip>
              </NuxtLink>
              <v-chip v-else size="small" color="teal" variant="tonal">
                {{ person.name }}
              </v-chip>
            </template>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12">

        <!-- Render Markdown content -->
        <div class="prose" v-html="renderedMarkdown"></div>

        <div v-if="rewriteReferences.length" class="mt-6">
          <h3 class="text-subtitle-1 mb-2">References</h3>
          <ul>
            <li
              v-for="ref in rewriteReferences"
              :key="ref.label + (ref.url || '')"
            >
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
      <v-col cols="12" class="text-center"> </v-col>
    </v-row>


    <v-row class="mt-2">
      <v-col cols="12" md="8" class="mx-auto">
        <v-card class="pa-4" elevation="1">
          <div class="d-flex flex-wrap ga-2 align-center justify-center">
            <v-btn
              v-if="supportsWebShare"
              color="primary"
              variant="tonal"
              size="small"
              @click="webShare"
            >
              Share
              <v-icon end>mdi-share-variant</v-icon>
            </v-btn>

            <v-btn
              color="primary"
              variant="text"
              size="small"
              :href="shareLinks.twitter"
              target="_blank"
              rel="noopener noreferrer"
            >
              X / Twitter
            </v-btn>
            <v-btn
              color="primary"
              variant="text"
              size="small"
              :href="shareLinks.facebook"
              target="_blank"
              rel="noopener noreferrer"
            >
              Facebook
            </v-btn>
            <v-btn
              color="primary"
              variant="text"
              size="small"
              :href="shareLinks.linkedin"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </v-btn>
            <v-btn
              color="primary"
              variant="text"
              size="small"
              :href="shareLinks.reddit"
              target="_blank"
              rel="noopener noreferrer"
            >
              Reddit
            </v-btn>
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              @click="copyLink"
            >
              {{ copySuccess ? "Copied!" : "Copy link" }}
              <v-icon end>mdi-content-copy</v-icon>
            </v-btn>
          </div>
        </v-card>
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
const supabase = useSupabaseClient?.();
const route = useRoute();
const slug = route.params.slug;
const currentLocale = locale.value || "en";

const chatThreadKey = ref(null);

const articleLanguage = computed(() => currentLocale || "en");
const {
  getArticleBySlug,
  getAllCategories,
  getAllTags,
  getAllPeople,
  getThreadKeyByArticleId,
} = useDb();

const { data: article, error } = await useAsyncData(`article-${slug}`, () =>
  getArticleBySlug(slug)
);

const categories = ref([]);
const tags = ref([]);
const people = ref([]);
const openFilterPanel = ref(null);
const filtersOpen = ref(false);
const filtersDrawerStyle = { zIndex: 1004, transition: "none !important" };

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
const peopleSlugs = computed(() => {
  const a = article.value;
  if (!a) return [];
  const list = Array.isArray(a.people) ? a.people : [];
  return [...new Set(list.map((p) => p?.slug).filter(Boolean))];
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
const displayCategory = computed(() => {
  const category = article.value?.category;
  if (category?.name) return category;
  const fallback = newsmeshMeta.value?.category;
  return fallback ? { name: fallback, slug: null } : null;
});
const articleTags = computed(() =>
  Array.isArray(article.value?.tags) ? article.value.tags : []
);
const articlePeople = computed(() =>
  Array.isArray(article.value?.people) ? article.value.people : []
);
const displayTags = computed(() => {
  if (articleTags.value.length) return articleTags.value;
  return newsmeshTopics.value.map((topic) => ({
    name: topic,
    slug: null,
  }));
});
const displayPeople = computed(() => {
  if (articlePeople.value.length) return articlePeople.value;
  return newsmeshPeople.value.map((person) => ({
    name: person,
    slug: null,
  }));
});
const peopleSlugByName = computed(() => {
  const map = new Map();
  (people.value || []).forEach((p) => {
    if (p?.name && p?.slug) {
      map.set(p.name.toLowerCase(), p.slug);
    }
  });
  return map;
});
const resolvedDisplayPeople = computed(() =>
  displayPeople.value.map((person) => {
    if (person.slug) return person;
    const normalizedName = person.name?.toLowerCase();
    if (!normalizedName) return person;
    const matchedSlug = peopleSlugByName.value.get(normalizedName);
    return matchedSlug ? { ...person, slug: matchedSlug } : person;
  })
);
const displayTitle = computed(
  () => article.value?.title || newsmeshMeta.value?.title  || ""
);
const displaySummary = computed(
  () =>
    newsmeshMeta.value?.summary ||
    rewriteMeta.value?.summary ||
    article.value?.summary ||
    ""
);

const heroImage = computed(() => {
  // Prefer generated public URL from Supabase to avoid double slashes or encoding issues
  if (article.value?.image_path && supabase?.storage) {
    const { data } = supabase.storage
      .from("articles")
      .getPublicUrl(article.value.image_path.replace(/^\/+/, ""));
    if (data?.publicUrl) return data.publicUrl;
  }

  // Fallback to manual concat if Supabase client not available
  if (article.value?.image_path) {
    const base = (config.public.SUPABASE_BUCKET || "").replace(/\/+$/, "");
    const path = String(article.value.image_path).replace(/^\/+/, "");
    return `${base}/articles/${path}`;
  }

  if (newsmeshMeta.value?.media_url) {
    return newsmeshMeta.value.media_url;
  }
  return null;
});

const displayPublishedDate = computed(
  () =>
    newsmeshMeta.value?.published_date ||
    article.value?.created_at ||
    null
);

const displaySourceLink = computed(() => {
  return (
    newsmeshMeta.value?.link ||
    newsmeshMeta.value?.source_url ||
    article.value?.photo_credits_url ||
    null
  );
});

const displaySourceLabel = computed(() => {
  const meta = newsmeshMeta.value;
  if (meta?.source) return meta.source;
  if (meta?.source_domain) return meta.source_domain;
  if (meta?.source_title) return meta.source_title;
  const link = displaySourceLink.value;
  if (link) {
    try {
      return new URL(link).hostname.replace(/^www\\./, "");
    } catch {
      return link;
    }
  }
  return null;
});

const heroImageAlt = computed(() =>
  displayTitle.value
    ? `${displayTitle.value} cover image`
    : "Article cover image"
);

const rewriteReferences = computed(() => rewriteMeta.value?.references || []);
const keywordList = computed(() =>
  displayTags.value.map((tag) => tag.name).filter(Boolean)
);
const displayPhotoCredits = computed(
  () => article.value?.photo_credits_html || ""
);
const shareUrl = ref("");
const shareTitle = ref("");
const copySuccess = ref(false);
const supportsWebShare = computed(
  () => typeof navigator !== "undefined" && !!navigator.share
);

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
    const [categoryData, tagData, peopleData] = await Promise.all([
      getAllCategories(),
      getAllTags(),
      getAllPeople(),
    ]);

    categories.value = categoryData || [];
    tags.value = tagData || [];
    people.value = peopleData || [];
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
    title: `${displayTitle.value}`,
    description: safeDescription,
    ogTitle: `${displayTitle.value}`,
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
    twitterTitle: `${displayTitle.value}`,
    twitterDescription: safeDescription,
    twitterImage: imageUrl,
    articleSection: article.value.category?.name || "Article",
    articlePublishedTime: article.value.created_at,
    articleModifiedTime: article.value.created_at,
    canonical: localizedShareUrl,
  });

  shareUrl.value = localizedShareUrl;
  shareTitle.value = displayTitle.value;

  const newsArticleSchema = computed(() => {
    if (!article.value) return null;

    const author = personaName.value
      ? {
          "@type": "Person",
          name: personaName.value,
          image: personaAvatar.value || undefined,
        }
      : undefined;

    return {
      "@context": "https://schema.org",
      "@type": "NewsArticle",
      headline: displayTitle.value,
      description: safeDescription,
      inLanguage: articleLanguage.value,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": localizedShareUrl,
      },
      image: imageUrl ? [imageUrl] : undefined,
      datePublished: article.value.created_at,
      dateModified: article.value.created_at,
      author,
      publisher: {
        "@type": "Organization",
        name: "ImChatty",
      },
      keywords: keywordList.value.length ? keywordList.value : undefined,
      articleSection: article.value.category?.name || undefined,
    };
  });

  if (newsArticleSchema.value) {
    useHead({
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(newsArticleSchema.value),
        },
      ],
    });
  }
}

const shareLinks = computed(() => {
  const url = encodeURIComponent(shareUrl.value || "");
  const title = encodeURIComponent(shareTitle.value || "");
  return {
    twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    reddit: `https://www.reddit.com/submit?url=${url}&title=${title}`,
  };
});

const copyLink = async () => {
  if (!shareUrl.value || typeof navigator === "undefined") return;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(shareUrl.value);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = shareUrl.value;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "absolute";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    copySuccess.value = true;
    setTimeout(() => (copySuccess.value = false), 2000);
  } catch (e) {
    console.warn("Copy failed", e);
  }
};

const webShare = async () => {
  if (!supportsWebShare.value || !shareUrl.value) return;
  try {
    await navigator.share({
      title: shareTitle.value,
      text: displaySummary.value || shareTitle.value,
      url: shareUrl.value,
    });
  } catch (e) {
    if (e && e.name !== "AbortError") {
      console.warn("Web Share failed", e);
    }
  }
};

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

.hero-image {
  position: relative;
  border-radius: 18px;
  overflow: hidden;
}

.hero-persona-card {
  position: absolute;
  top: 18px;
  left: 18px;
  background: rgba(15, 23, 42, 0.82);
  border-radius: 999px;
  padding: 0.65rem 1.6rem 0.65rem 0.65rem;
  color: #fff;
  box-shadow: 0 15px 35px rgba(15, 23, 42, 0.35);
  backdrop-filter: blur(6px);
}

.hero-persona-card .text-caption,
.hero-persona-card .text-subtitle-1,
.hero-persona-card .text-body-2 {
  color: inherit !important;
}

.hero-image-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(
    180deg,
    rgba(15, 23, 42, 0) 0%,
    rgba(15, 23, 42, 0.85) 100%
  );
}
.hero-photo-credit {
  max-width: 60%;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-left: 14px;
}

@media (max-width: 960px) {
  .hero-photo-credit {
    max-width: 70%;
  }
}

.prose :deep(.newsmesh-article) {
  background: #fff;
  border: 1px solid rgba(0, 0, 0, 0.06);
  border-radius: 18px;
  padding: 2.25rem;
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

.prose :deep(.newsmesh-article .article-header) {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
}

.prose :deep(.newsmesh-article .source-line) {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  margin-bottom: 0.2rem;
}

.prose :deep(.newsmesh-article .persona-line) {
  font-weight: 600;
  color: #0d9488;
  margin: 0.4rem 0 0.8rem;
}

.prose :deep(.newsmesh-article .article-summary) {
  font-size: 1rem;
  color: #475569;
  background: #f1f5f9;
  border-left: 4px solid #6366f1;
  padding: 0.65rem 0.9rem;
  border-radius: 8px;
}

.prose :deep(.newsmesh-article .rewrite-body p) {
  line-height: 1.8;
  margin-bottom: 1.1rem;
  font-size: 1.03rem;
}

.prose :deep(.newsmesh-article .rewrite-body p:last-child) {
  margin-bottom: 0;
}

.chip-link {
  cursor: pointer;
}
</style>
