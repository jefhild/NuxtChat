<template>
  <v-col>
    <v-card
      class="article-card d-flex flex-column justify-between"
      elevation="2"
      :style="{ minHeight: props.admin ? '360px' : '280px' }"
    >
      <NuxtLink
        :to="localPath(`/articles/${article.slug}`)"
        class="card-link position-relative"
        :aria-label="article.title"
      >
        <v-img
          v-if="articleImageUrl"
          class="text-white article-img"
          height="200"
          :src="articleImageUrl"
          :alt="articleImageAlt"
          cover
        >
          <!-- Overlay button -->
          <div class="discuss-btn-container top-left">
            <!-- {{ chatThreadId }} -->
            <NuxtLink
              v-if="chatThreadId"
              :to="localPath(`/chat/articles/${chatThreadId}`)"
              class="discuss-link"
              @click.stop
            >
              <v-btn color="primary" size="small">Discuss…</v-btn>
            </NuxtLink>
          </div>

          <!-- Title -->
          <div class="title-overlay w-100 text-center px-3">
            <h2 class="font-weight-bold text-subtitle-1 text-md-h5 title-text">
              {{ article.title }}
            </h2>
          </div>

          <!-- Photo credits (bottom-right overlay) -->
          <div
            v-if="article.photo_credits_url"
            class="overlay-bottom-right pr-4"
          >
            <a
              :href="article.photo_credits_url"
              class="text-caption text-decoration-underline"
              target="_blank"
              rel="noopener noreferrer"
              @click.stop
            >
              Photo Credits
            </a>
          </div>
        </v-img>
      </NuxtLink>

      <v-card-subtitle class="mb-2 text-medium-emphasis">
        <div class="d-flex align-center justify-space-between mt-2 w-100">
          <div class="d-flex align-center">
            <v-icon>mdi-folder</v-icon>
            <span class="ml-1">{{ article.category_name }}</span>
          </div>
          <span class="date-text">{{ formatDate(article.created_at) }}</span>
        </div>
      </v-card-subtitle>

      <v-card-text v-html="truncatedSummary" />
      <v-card-text>
        <div class="tags-links">
          <NuxtLink
            v-for="tag in article.tags"
            :key="tag?.slug || tag"
            :to="localPath(`/tags/${formatTagSlug(tag)}`)"
            class="tag-link"
          >
            #{{ tag?.name || tag }}
          </NuxtLink>
        </div>
      </v-card-text>

      <v-spacer />

      <!-- Admin badges -->
      <v-card-actions v-if="props.admin" class="pt-0">
        <v-chip
          v-if="article.is_published"
          color="success"
          size="x-small"
          class="ml-2"
          label
        >
          Published
        </v-chip>
        <v-chip v-else color="grey" size="x-small" class="ml-2" label>
          Draft
        </v-chip>
      </v-card-actions>
    </v-card>
  </v-col>
</template>

<script setup>
const localPath = useLocalePath();
const { public: pub } = useRuntimeConfig();
const supabase = useSupabaseClient?.();

const props = defineProps({
  article: { type: Object, required: true },
  disableNavigation: { type: Boolean, default: false }, // no longer used here
  admin: { type: Boolean, default: false },
  chatThreadId: { type: String, default: null },
});

// Build the public image URL from env + prop
const articleImageUrl = computed(() => {
  const rawPath =
    props.article?.imagePath || props.article?.image_path || "";
  const cleanPath = String(rawPath).replace(/^\/+/, "");

  if (cleanPath && supabase?.storage) {
    const { data } = supabase.storage.from("articles").getPublicUrl(cleanPath);
    if (data?.publicUrl) return data.publicUrl;
  }

  const base = (pub.SUPABASE_BUCKET || "").replace(/\/+$/, "");
  return base && cleanPath ? `${base}/articles/${cleanPath}` : "";
});

const articleImageAlt = computed(() => {
  const title = props.article?.title || props.article?.slug;
  return title ? `${title} cover image` : "Article cover image";
});

const truncatedSummary = computed(() => {
  const maxLength = 300;
  const content = props.article?.content || "";
  if (!content) return "";

  const headerMatch = content.match(/<header[\s\S]*?<\/header>/i);
  if (headerMatch) {
    return headerMatch[0];
  }

  return content.length > maxLength
    ? content.slice(0, maxLength) + "..."
    : content;
});

const formatDate = (isoDate) =>
  new Date(isoDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatTagSlug = (tag) => {
  const value = tag?.slug || tag;
  return typeof value === "string" ? value.toLowerCase() : "";
};
</script>

<style scoped>
/* Base card (no purple hover, no pop) */
.article-card {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  margin: 0 10px;
  background-color: #fff;
  transition: box-shadow 0.2s ease; /* only subtle shadow change */
}
.article-card:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
}

.article-img {
  position: relative;
}

/* Make the top link block-level and remove default link styles */
.card-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

/* Title styling */
.title-text {
  white-space: normal;
  word-break: break-word;
  margin: 0; /* tighter spacing */
}

/* Tags */
.tags-links {
  display: flex;
  flex-wrap: wrap; /* allow wrapping on smaller screens */
  justify-content: center; /* horizontally center */
  gap: 0.5rem; /* space between tags */
  text-align: center; /* center text if lines wrap */
  margin-top: 0.5rem;
}
.tag-link {
  font-size: 0.8rem;
  color: #5e35b1;
  text-decoration: none;
  background-color: #f3e5f5;
  padding: 4px 8px;
  border-radius: 12px;
  transition: background-color 0.2s ease, color 0.2s ease;
}
.tag-link:hover {
  background-color: #d1c4e9;
  color: #311b92;
}

.card-link {
  display: block;
  position: relative;
  text-decoration: none;
  color: inherit;
}

.article-card :deep(.article-header) {
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
}

.article-card :deep(.article-header h2) {
  font-size: 1.05rem;
  margin: 0.25rem 0;
}

.article-card :deep(.persona-line) {
  font-weight: 600;
  color: #0d9488;
  margin-bottom: 0.35rem;
}

.article-card :deep(.article-summary) {
  font-size: 0.9rem;
  color: #475569;
}

/* Overlay container — default fade-in behavior */
.discuss-btn-container {
  position: absolute;
  top: 12px;
  left: 12px;
  opacity: 0.9;
  transform: none;
  transition: opacity 0.3s ease;
  pointer-events: auto;
  z-index: 3;
}

/* Modifier for top-left placement */
.discuss-btn-container.top-left {
  top: 12px;
  left: 12px;
}

.overlay-bottom-right {
  position: absolute;
  bottom: 4px;
  right: 9px;
  z-index: 3;
}

/* Date styling to match category tone */
.date-text {
  color: #6b7280; /* neutral grey similar to category text */
  font-size: 0.9rem;
}

/* Fade in on hover */
.article-img:hover .discuss-btn-container {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}

/* Keep link clean */
.discuss-link {
  text-decoration: none;
}

.title-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 2;
  padding: 0 12px;
}

</style>
