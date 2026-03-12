<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title>Existing Articles</v-card-title>

    <LoadingContainer
      v-if="loadingArticles"
      :text="$t('pages.articles.index.loading')"
    />
    <v-card-text v-else>
      <v-col>
        <div class="articles-wrapper">
          <!-- Search -->
          <v-text-field
            v-model="searchQuery"
            label="Search articles..."
            prepend-inner-icon="mdi-magnify"
            clearable
            class="mb-4"
          />

          <!-- Article Cards -->
          <v-row dense>
         <v-col
  v-for="article in paginatedArticles"
  :key="article.id"
  cols="12"
  sm="6"
  md="6"
  lg="4"
>
  <v-card class="d-flex flex-column h-100">
    <ArticleCard
      :article="article"
      disableNavigation
      admin
      class="flex-grow-1"
      @click="toggleEditDialog(article)"
    />

    <v-divider />
    <v-card-actions class="align-center">
      <v-btn
        :color="article.isPublishedToChat ? 'red' : 'primary'"
        class="flex-grow-1"
        @click="togglePublish(article)"
      >
        {{ article.isPublishedToChat ? 'Unpublish from Chat' : 'Publish to Chat' }}
      </v-btn>
      <v-btn
        icon="mdi-delete"
        variant="text"
        color="red"
        @click="confirmDeleteArticle(article)"
      />
    </v-card-actions>
  </v-card>
</v-col>
         
         
         
          </v-row>

          <v-alert
            v-if="!paginatedArticles.length"
            type="info"
            variant="tonal"
            border="top"
            border-color="primary"
          >
            No articles found for "{{ searchQuery }}".
          </v-alert>

          <!-- Pagination -->
          <v-pagination
            v-model="currentPage"
            :length="pageCount"
            class="mt-6"
            color="primary"
          ></v-pagination>
        </div>
      </v-col>
    </v-card-text>
  </v-card>
  <v-snackbar
    v-model="snackbar.show"
    :timeout="3000"
    color="red"
    location="top"
  >
    {{ snackbar.message }}
  </v-snackbar>

  <v-dialog v-model="editDialog" max-width="700px">
    <v-card>
      <v-card-title>Edit Article</v-card-title>

      <v-card-text v-if="loadingUpdate" class="text-center">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>

      <v-card-text v-else>
        <NuxtImg
          v-if="selectedArticle.image_path"
          :src="`${config.public.SUPABASE_BUCKET}/articles/${selectedArticle.image_path}`"
          width="150"
          height="auto"
          class="mt-2 rounded"
        />
        <v-form ref="editForm" @submit.prevent="handleArticleUpdate">
          <v-file-input
            accept="image/*"
            label="Upload Image"
            @change="handleEditImageChange"
          />
          <!-- <v-text-field
            v-model="selectedArticle.photo_credits_url"
            label="Photo Credit URL"
            :rules="[isValidUrl]"
          /> -->
          <v-text-field
            v-if="selectedArticle.image_path"
            v-model="selectedArticle.photo_credits_url"
            label="Photo Credit URL"
            :rules="[isValidUrl]"
          />
          <v-textarea
            v-if="selectedArticle.image_path"
            v-model="selectedArticle.photo_credits_html"
            label="Photo Credit HTML (shown on article page)"
            rows="3"
            auto-grow
            hint="Example: &lt;a href='...'>Photographer&lt;/a>, Public domain, via ..."
            persistent-hint
          />
          <v-text-field
            v-model="selectedArticle.title"
            label="Title"
            :rules="[(v) => !!v || 'Title is required']"
          />
          <v-select
            v-model="selectedArticle.original_language_code"
            :items="languageOptions"
            item-title="label"
            item-value="value"
            label="Original Language"
            clearable
            hint="Defaults to blank if unknown."
            persistent-hint
          />
          <div class="mb-4">
            <v-btn
              color="primary"
              variant="outlined"
              size="small"
              :disabled="!selectedArticle.id"
              :loading="translationLoading"
              @click="openTranslationDialog"
            >
              Translate
            </v-btn>
            <v-btn
              color="deep-orange-darken-1"
              variant="outlined"
              size="small"
              class="ml-2"
              :disabled="!selectedArticle.id"
              :loading="moltbookLoading"
              @click="postSelectedArticleToMoltbook"
            >
              {{ selectedArticleMoltbookButtonLabel }}
            </v-btn>
          </div>
          <v-row>
            <v-col cols="12" md="6">
              <v-select
                v-model="selectedArticle.category_id"
                :items="categories"
                item-title="name"
                item-value="id"
                label="Category"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="selectedArticle.type"
                :items="types"
                label="Type"
              />
            </v-col>
          </v-row>

          <v-combobox
            v-model="selectedArticle.tag_names"
            :items="tags"
            item-title="name"
            item-value="name"
            label="Tags"
            multiple
            chips
            clearable
          />

          <v-textarea
            v-model="selectedArticle.summary"
            label="Summary"
            rows="3"
            auto-grow
            hint="Used for article summary display and metadata."
            persistent-hint
          />

          <v-textarea
            v-model="selectedArticle.social_facebook_caption"
            label="Facebook Caption"
            rows="3"
            auto-grow
            hint="1-2 sentences, include the URL."
            persistent-hint
          />
          <v-textarea
            v-model="selectedArticle.social_instagram_caption"
            label="Instagram Caption"
            rows="3"
            auto-grow
            hint="1-2 sentences, no link, add hashtags."
            persistent-hint
          />

          <v-textarea
            v-model="selectedArticle.content"
            label="HTML Content"
            rows="6"
            auto-grow
            :rules="[(v) => !!v || 'Content is required']"
          />

          <v-textarea
            v-model="selectedArticle.template_css"
            label="Template CSS (article slug page)"
            rows="8"
            auto-grow
            hint="Stored in rewrite_meta.template_css. Example: .newsmesh-article .article-header { border-color: #0ea5e9; }"
            persistent-hint
          />

          <v-divider class="my-4" />
          <div class="text-subtitle-2 mb-2">Insert Inline Image</div>
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="inlineEditImageAlt"
                label="Image alt text"
                placeholder="Describe the image"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="inlineEditImageCaption"
                label="Caption (optional)"
                placeholder="Photo credit or caption"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="inlineEditImageWidth"
                label="Width (optional)"
                placeholder="e.g. 320px or 60%"
              />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="inlineEditImageHeight"
                label="Height (optional)"
                placeholder="e.g. 180px"
              />
            </v-col>
            <v-col cols="12">
              <v-file-input
                accept="image/*"
                label="Upload inline image"
                show-size
                @update:modelValue="handleInlineEditImageInsert"
              />
            </v-col>
          </v-row>

          <div class="html-preview" v-html="selectedArticle.content" ref="editPreviewRef"></div>
          <v-row align="center">
            <v-col cols="12" sm="6">
              <v-switch
                v-model="selectedArticle.is_published"
                label="Published"
                color="primary"
              />
            </v-col>
            <v-col cols="12" sm="6" class="text-sm-right">
              <v-btn
                v-if="selectedArticle.is_published"
                color="blue-darken-2"
                disabled
              >
                Facebook setup needed
              </v-btn>
            </v-col>
          </v-row>
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-btn
          :disabled="loadingUpdate"
          color="primary"
          :to="`/articles/${selectedArticle.slug}`"
        >
          Go to Article Page
        </v-btn>
        <v-spacer />
        <v-btn
          :disabled="loadingUpdate"
          color="primary"
          @click="handleArticleUpdate"
          >Save</v-btn
        >
        <v-btn
          :disabled="loadingUpdate"
          color="red"
          @click="toggleEditDialog(null)"
          >Cancel</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
  <v-dialog v-model="translationDialog" max-width="480">
    <v-card>
      <v-card-title>Translate Article</v-card-title>
      <v-card-text>
        <v-select
          v-model="translationForm.locales"
          :items="translationOptions"
          item-title="label"
          item-value="value"
          label="Target languages"
          multiple
          chips
          :disabled="translationForm.translateAll"
        />
        <v-checkbox
          v-model="translationForm.translateAll"
          label="Translate to all other languages"
          hide-details
        />
        <v-checkbox
          v-model="translationForm.overwrite"
          label="Overwrite existing translation"
          hide-details
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn variant="text" @click="translationDialog = false">
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :loading="translationLoading"
          @click="runTranslation"
        >
          Translate
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t, locale } = useI18n();
import { useDisplay } from "vuetify";
import { nextTick, onBeforeUnmount, watch } from "vue";
import { loadTwitterWidgets } from "@/composables/useTwitterWidgets.js";
const {
  getAllArticlesWithTags,
  getAllCategories,
  getAllTags,
  getTagsByArticle,
  getTagsByArticleId,
  updateArticle,
  updateArticleTags,
  uploadArticleImage,
} = useDb();

const editDialog = ref(false);
const selectedArticle = ref({});
const editForm = ref(null);
const loadingUpdate = ref(false);

const searchQuery = ref("");

const articles = ref([]);
const categories = ref([]);
const tags = ref([]);
const types = ref(["blog", "guide"]);
const languageOptions = [
  { label: "English (en)", value: "en" },
  { label: "French (fr)", value: "fr" },
  { label: "Spanish (es)", value: "es" },
  { label: "Russian (ru)", value: "ru" },
  { label: "Chinese (zh)", value: "zh" },
];
const loadingArticles = ref(true);

const currentPage = ref(1);
const config = useRuntimeConfig();
const { md, smAndDown, xs } = useDisplay();
const editPreviewRef = ref(null);
const inlineEditImageAlt = ref("");
const inlineEditImageCaption = ref("");
const inlineEditImageWidth = ref("");
const inlineEditImageHeight = ref("");

const perPage = computed(() => {
  if (xs.value) return 1; // Extra small: 1 card per page
  if (smAndDown.value) return 2; // Small screen: 2 per page
  if (md.value) return 2; // Medium and up: 3 per page
  return 3; // Fallback
});

const snackbar = ref({
  show: false,
  message: "",
});
const translationOptions = computed(() => {
  const original = String(selectedArticle.value?.original_language_code || "")
    .trim()
    .toLowerCase();
  if (!original) return languageOptions;
  return languageOptions.filter(
    (option) => option.value.toLowerCase() !== original
  );
});
const translationDialog = ref(false);
const translationLoading = ref(false);
const moltbookLoading = ref(false);
const translationJob = ref(null);
let translationPollTimer = null;
const translationForm = ref({
  locales: [],
  translateAll: false,
  overwrite: false,
});
const selectedArticleMoltbookPostId = computed(
  () => selectedArticle.value?.rewrite_meta?.moltbook?.post_id || ""
);
const selectedArticleMoltbookButtonLabel = computed(() =>
  selectedArticleMoltbookPostId.value ? "Repost to Moltbook" : "Post to Moltbook"
);

const stopTranslationPolling = () => {
  if (translationPollTimer) {
    clearInterval(translationPollTimer);
    translationPollTimer = null;
  }
};

const applyTranslationJob = (job) => {
  translationJob.value = job || null;
  if (!job) return;

  if (job.status === "completed") {
    stopTranslationPolling();
    translationLoading.value = false;
    const parts = [];
    if (job.translated?.length) parts.push(`Translated: ${job.translated.join(", ")}`);
    if (job.skipped?.length) parts.push(`Skipped: ${job.skipped.join(", ")}`);
    snackbar.value = {
      show: true,
      message: parts.length ? parts.join(" · ") : "Translation complete.",
    };
    translationDialog.value = false;
  } else if (job.status === "failed") {
    stopTranslationPolling();
    translationLoading.value = false;
    snackbar.value = {
      show: true,
      message: job.error || "Failed to translate article.",
    };
  }
};

const pollTranslationJob = async (jobId) => {
  if (!jobId) return;
  try {
    const response = await $fetch("/api/admin/articles/translate-status", {
      query: {
        jobId,
        articleId: selectedArticle.value?.id || "",
      },
    });
    if (response?.success) {
      applyTranslationJob(response.job || null);
    }
  } catch (error) {
    console.error("[admin] translation status", error);
  }
};

const startTranslationPolling = (jobId) => {
  stopTranslationPolling();
  pollTranslationJob(jobId);
  translationPollTimer = setInterval(() => {
    pollTranslationJob(jobId);
  }, 2000);
};


const publishToChat = async (article) => {
  try {
    // quick defaults; you can add a dialog later to edit these
    const body = {
      articleId: article.id,
      title: article.title,
      botLabel: 'Topic Agent',
      botAvatarUrl: article.image_path
        ? `${config.public.SUPABASE_BUCKET}/articles/${article.image_path}`
        : null,
      summary: '',           // optional: prefill from a short abstract later
      points: [],            // optional
      tags: article.tags || [],
      rules: ['be respectful', 'stay on topic'],
      overrides: { lull_minutes: 8, reply_cooldown_seconds: 120 },
    }

    const res = await $fetch('/api/admin/articles/publish', {
      method: 'POST',
      body
    })

    if (!res?.success) throw new Error(res?.error || 'Publish failed')
    const moltbookNote = res?.moltbook?.posted
      ? ' + posted to Moltbook'
      : res?.moltbook?.reason === 'already_posted'
      ? ' · Moltbook already posted'
      : res?.moltbook?.attempted
      ? ` · Moltbook skipped: ${res?.moltbook?.reason || 'unknown'}`
      : ''
    snackbar.value = { show: true, message: `Published to chat ✅${moltbookNote}` }
  } catch (e) {
    console.error('[admin] publishToChat', e)
    snackbar.value = { show: true, message: `Publish failed: ${e.message || e}` }
  }
}

const openTranslationDialog = () => {
  const baseLocale = String(locale.value || "")
    .split("-")[0]
    .trim();
  const defaultLocales = translationOptions.value.some(
    (option) => option.value === baseLocale
  )
    ? [baseLocale]
    : [];
  translationForm.value = {
    locales: defaultLocales,
    translateAll: false,
    overwrite: false,
  };
  translationDialog.value = true;
};

const runTranslation = async () => {
  if (!selectedArticle.value?.id) return;
  const targets = translationForm.value.translateAll
    ? translationOptions.value.map((option) => option.value)
    : translationForm.value.locales;
  if (!targets.length) {
    snackbar.value = {
      show: true,
      message: "Select at least one target language.",
    };
    return;
  }
  translationLoading.value = true;
  try {
    const response = await $fetch("/api/admin/articles/translate", {
      method: "POST",
      body: {
        articleId: selectedArticle.value.id,
        targetLocales: targets,
        sourceLocale:
          selectedArticle.value.original_language_code || "en",
        overwrite: translationForm.value.overwrite,
        background: true,
      },
    });

    if (!response?.success) {
      throw new Error(response?.error || "Translation failed.");
    }

    translationJob.value = response?.job || null;
    snackbar.value = {
      show: true,
      message: "Translation job started.",
    };
    if (response?.job?.id) {
      startTranslationPolling(response.job.id);
    } else {
      translationLoading.value = false;
    }
  } catch (err) {
    stopTranslationPolling();
    console.error("[admin] translate article", err);
    snackbar.value = {
      show: true,
      message: err?.message || "Failed to translate article.",
    };
  } finally {
    translationLoading.value = false;
  }
};

const postSelectedArticleToMoltbook = async () => {
  if (!selectedArticle.value?.id) return;
  moltbookLoading.value = true;
  try {
    const force = Boolean(selectedArticleMoltbookPostId.value);
    const response = await $fetch("/api/admin/articles/moltbook", {
      method: "POST",
      body: {
        articleId: selectedArticle.value.id,
        force,
      },
    });

    if (!response?.success) {
      throw new Error(response?.error || "Moltbook publish failed.");
    }

    if (response?.rewrite_meta) {
      selectedArticle.value.rewrite_meta = response.rewrite_meta;
    }

    const note = response?.moltbook?.posted
      ? force
        ? "Article reposted to Moltbook."
        : "Article posted to Moltbook."
      : response?.moltbook?.reason === "already_posted"
      ? "Article already has a Moltbook post."
      : `Moltbook skipped: ${response?.moltbook?.reason || "unknown"}`;

    snackbar.value = {
      show: true,
      message: note,
    };
  } catch (error) {
    console.error("[admin] article moltbook post", error);
    snackbar.value = {
      show: true,
      message: error?.message || "Failed to post article to Moltbook.",
    };
  } finally {
    moltbookLoading.value = false;
  }
};


const togglePublish = async (article) => {
  try {
    if (article.isPublishedToChat) {
      const res = await $fetch('/api/admin/articles/unpublish', {
        method: 'POST',
        body: { articleId: article.id, force: true },
      })
      if (!res?.success) throw new Error(res?.error)
      article.isPublishedToChat = false
      snackbar.value = { show: true, message: 'Unpublished from chat ✅' }
    } else {
      const res = await $fetch('/api/admin/articles/publish', {
        method: 'POST',
        body: {
          articleId: article.id,
          title: article.title,
          botLabel: 'Topic Agent',
          botAvatarUrl: article.image_path
            ? `${config.public.SUPABASE_BUCKET}/articles/${article.image_path}`
            : null,
          summary: '',
          points: [],
          tags: article.tags || [],
          rules: ['be respectful', 'stay on topic'],
          overrides: { lull_minutes: 8, reply_cooldown_seconds: 120 },
        },
      })
      if (!res?.success) throw new Error(res?.error)
      article.isPublishedToChat = true
      const moltbookNote = res?.moltbook?.posted
        ? ' + posted to Moltbook'
        : res?.moltbook?.reason === 'already_posted'
        ? ' · Moltbook already posted'
        : res?.moltbook?.attempted
        ? ` · Moltbook skipped: ${res?.moltbook?.reason || 'unknown'}`
        : ''
      snackbar.value = { show: true, message: `Published to chat ✅${moltbookNote}` }
    }
  } catch (e) {
    console.error('[admin] togglePublish', e)
    snackbar.value = { show: true, message: `Action failed: ${e.message || e}` }
  }
}



const unpublishFromChat = async (article) => {
  try {
    const res = await $fetch('/api/admin/articles/unpublish', {
      method: 'POST',
      body: {
        articleId: article.id,
        // or threadId: '...'
        force: false, // set true to delete messages + thread
      }
    })
    if (!res?.success) throw new Error(res?.error || 'Unpublish failed')
    snackbar.value = { show: true, message: 'Unpublished from chat ✅' }
  } catch (e) {
    console.error('[admin] unpublishFromChat', e)
    snackbar.value = { show: true, message: `Unpublish failed: ${e.message || e}` }
  }
}

const confirmDeleteArticle = async (article) => {
  if (!article?.id) return;
  const confirmed =
    typeof window === "undefined" ||
    window.confirm(
      `Delete "${article.title}"? This will remove the article and any chat thread/messages.`
    );
  if (!confirmed) return;

  try {
    const res = await $fetch("/api/admin/articles/delete", {
      method: "POST",
      body: { articleId: article.id, force: true },
    });
    if (!res?.success) throw new Error(res?.error || "Delete failed");
    articles.value = articles.value.filter((a) => a.id !== article.id);
    snackbar.value = { show: true, message: "Article deleted ✅" };
  } catch (e) {
    console.error("[admin] deleteArticle", e);
    snackbar.value = {
      show: true,
      message: `Delete failed: ${e.message || e}`,
    };
  }
};

onMounted(async () => {
  articles.value = await getAllArticlesWithTags(false);
  // console.log("articles", articles.value);
  categories.value = (await getAllCategories()) || [];
  tags.value = (await getAllTags()) || [];


  try {
    const { data } = await $fetch('/api/admin/articles/published') // we'll create this tiny endpoint
    const publishedIds = new Set((data || []).map(t => t.article_id))
    articles.value = articles.value.map(a => ({
      ...a,
      isPublishedToChat: publishedIds.has(a.id),
    }))
  } catch (e) {
    console.warn('[admin] failed to fetch publish states', e)
  }


  loadingArticles.value = false;
});

onBeforeUnmount(() => {
  stopTranslationPolling();
});

const filteredArticles = computed(() => {
  if (!searchQuery.value.trim()) return articles.value;

  return articles.value.filter((article) =>
    article.title.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

const paginatedArticles = computed(() => {
  const start = (currentPage.value - 1) * perPage.value;
  return filteredArticles.value.slice(start, start + perPage.value);
});

const pageCount = computed(() => {
  return Math.ceil(filteredArticles.value.length / perPage.value);
});

const formatName = (name) =>
  name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const slugify = (text) =>
  text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "");

const decodeHtml = (value = "") =>
  String(value)
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#039;/gi, "'");

const stripTags = (value = "") =>
  decodeHtml(String(value).replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

const escapeHtmlText = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const sanitizeTemplateCss = (value = "") =>
  String(value || "")
    .replace(/<style\b[^>]*>/gi, "")
    .replace(/<\/style>/gi, "")
    .replace(/@import[\s\S]*?;/gi, "")
    .trim();

const extractSummaryFromHtml = (content = "") => {
  const match = String(content || "").match(
    /<p[^>]*class=["'][^"']*article-summary[^"']*["'][^>]*>([\s\S]*?)<\/p>/i
  );
  return match?.[1] ? stripTags(match[1]) : "";
};

const upsertSummaryInHtml = (content = "", summary = "") => {
  const safeSummary = String(summary || "").trim();
  const safeContent = String(content || "");
  const escapedSummary = escapeHtmlText(safeSummary);
  const summaryBlock = safeSummary
    ? `<p class="article-summary">${escapedSummary}</p>`
    : "";
  const summaryRegex =
    /<p[^>]*class=["'][^"']*article-summary[^"']*["'][^>]*>[\s\S]*?<\/p>/i;

  if (summaryRegex.test(safeContent)) {
    return safeSummary ? safeContent.replace(summaryRegex, summaryBlock) : safeContent.replace(summaryRegex, "");
  }

  if (!safeSummary) return safeContent;

  if (/<\/header>/i.test(safeContent)) {
    return safeContent.replace(/<\/header>/i, `${summaryBlock}</header>`);
  }

  return safeContent ? `${safeContent}\n${summaryBlock}` : summaryBlock;
};

const normalizeTopicList = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (entry && typeof entry === "object") {
          return (
            entry.name ||
            entry.label ||
            entry.value ||
            entry.title ||
            JSON.stringify(entry)
          );
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof value === "string") return [value];
  if (typeof value === "object") {
    return Object.values(value || {})
      .map((entry) => (typeof entry === "string" ? entry : null))
      .filter(Boolean);
  }
  return [];
};

const getTagIdsFromTopics = (topics) => {
  const names = normalizeTopicList(topics);
  if (!names.length) return [];
  return names
    .map((name) => {
      const slug = slugify(name);
      return (
        tags.value.find((t) => t.name === name)?.id ||
        tags.value.find((t) => t.slug === slug)?.id ||
        null
      );
    })
    .filter(Boolean);
};

const getTagNamesFromTopics = (topics) => {
  const names = normalizeTopicList(topics);
  if (!names.length) return [];
  const normalized = names.map((name) => name.trim()).filter(Boolean);
  if (!normalized.length) return [];
  const byName = new Map(
    tags.value.map((t) => [String(t.name || "").toLowerCase(), t.name])
  );
  return normalized.map((name) => byName.get(name.toLowerCase()) || name);
};

const findTagIdFromArticleTag = (tag) => {
  if (!tag) return null;

  if (typeof tag === "object") {
    return (
      tag.id ||
      tags.value.find((t) => t.slug === tag.slug)?.id ||
      tags.value.find((t) => t.name === tag.name)?.id ||
      null
    );
  }

  if (typeof tag === "string") {
    return tags.value.find((t) => t.name === tag)?.id || null;
  }

  return null;
};

const escapeInlineText = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const buildInlineImageStyle = (width, height) => {
  const safeWidth = escapeInlineText(width || "");
  const safeHeight = escapeInlineText(height || "");
  const styles = [];
  if (safeWidth) styles.push(`width:${safeWidth}`);
  if (safeHeight) styles.push(`height:${safeHeight}`);
  styles.push("max-width:100%");
  styles.push("height:auto");
  return styles.length ? ` style="${styles.join(";")}"` : "";
};

const buildInlineImageHtml = (
  imagePath,
  altText,
  captionText,
  width,
  height
) => {
  const base = (config.public.SUPABASE_BUCKET || "").replace(/\/+$/, "");
  const path = String(imagePath || "").replace(/^\/+/, "");
  const src = `${base}/articles/${path}`;
  const alt = escapeInlineText(altText || "");
  const caption = captionText
    ? `<figcaption>${escapeInlineText(captionText)}</figcaption>`
    : "";
  const styleAttr = buildInlineImageStyle(width, height);
  return `<figure class="article-media"><img src="${src}" alt="${alt}" loading="lazy"${styleAttr} />${caption}</figure>`;
};

const appendHtml = (currentValue, htmlToAdd) => {
  const safeCurrent = currentValue || "";
  return safeCurrent ? `${safeCurrent}\n${htmlToAdd}` : htmlToAdd;
};

const handleInlineEditImageInsert = async (file) => {
  if (!file || !file.name) return;
  const imagePath = await uploadArticleImage(file, selectedArticle.value.id);
  if (!imagePath) return;
  const html = buildInlineImageHtml(
    imagePath,
    inlineEditImageAlt.value,
    inlineEditImageCaption.value,
    inlineEditImageWidth.value,
    inlineEditImageHeight.value
  );
  selectedArticle.value.content = appendHtml(
    selectedArticle.value.content,
    html
  );
  inlineEditImageAlt.value = "";
  inlineEditImageCaption.value = "";
  inlineEditImageWidth.value = "";
  inlineEditImageHeight.value = "";
};

// After editing selectedArticle content, ensure twitter widgets parse
watch(
  () => selectedArticle.value.content,
  () => {
    nextTick(() => {
      try {
        if (editPreviewRef?.value) loadTwitterWidgets(editPreviewRef.value);
      } catch (e) {
        // ignore
      }
    });
  }
);

const handleEditImageChange = async (event) => {
  const file = event.target.files[0];
  if (!file || !selectedArticle.value.slug) return;

  //   const imagePath = await uploadArticleImage(file);
  const imagePath = await uploadArticleImage(file, selectedArticle.value.id);
  if (imagePath) {
    selectedArticle.value.image_path = imagePath;
  }
};


const ensureTagsForArticle = async (article) => {
  if (!article?.tags?.length) return;
  const missing = article.tags.some((tag) => {
    const tagId = typeof tag === "object" ? tag?.id : null;
    if (tagId) return !tags.value.some((t) => t.id === tagId);
    const slug = typeof tag === "object" ? tag?.slug : null;
    const name = typeof tag === "object" ? tag?.name : tag;
    return !tags.value.some(
      (t) => (slug && t.slug === slug) || (name && t.name === name)
    );
  });
  if (missing) {
    tags.value = (await getAllTags()) || [];
  }
};

const toggleEditDialog = async (article) => {
  if (!article) {
    editDialog.value = false;
    selectedArticle.value = {};
    return;
  }

  let articleTags = Array.isArray(article.tags) ? article.tags : [];
  if (!articleTags.length && article.id) {
    articleTags = (await getTagsByArticleId(article.id)) || [];
  }
  if (!articleTags.length && article.slug) {
    articleTags = (await getTagsByArticle(article.slug)) || [];
  }
  await ensureTagsForArticle({ ...article, tags: articleTags });
  const newsmeshTopics = article.newsmesh_meta?.topics;
  let topicTagIds = !articleTags.length
    ? getTagIdsFromTopics(newsmeshTopics)
    : [];
  let topicTagNames = !articleTags.length
    ? getTagNamesFromTopics(newsmeshTopics)
    : [];
  if (!articleTags.length && newsmeshTopics && !topicTagIds.length) {
    tags.value = (await getAllTags()) || [];
    topicTagIds = getTagIdsFromTopics(newsmeshTopics);
    topicTagNames = getTagNamesFromTopics(newsmeshTopics);
  }
  const existingSocial = article.rewrite_meta?.social || {};
  const summaryFallback =
    article.rewrite_meta?.summary ||
    article.newsmesh_meta?.summary ||
    article.newsmesh_meta?.source_summary ||
    extractSummaryFromHtml(article.content || "");
  selectedArticle.value = {
    id: article.id,
    title: article.title,
    content: article.content,
    image_path: article.image_path,
    photo_credits_url: article.photo_credits_url,
    photo_credits_html: article.photo_credits_html,
    original_language_code:
      article.original_language_code ||
      article.newsmesh_meta?.language_code ||
      "",
    slug: article.slug,
    type: article.type || "",
    rewrite_meta: article.rewrite_meta || {},
    newsmesh_meta: article.newsmesh_meta || {},
    template_css: article.rewrite_meta?.template_css || "",
    summary: summaryFallback || "",
    social_facebook_caption: existingSocial?.facebook?.caption || "",
    social_instagram_caption: existingSocial?.instagram?.caption || "",

    // Get the category ID based on the name
    category_id:
      categories.value.find((cat) => cat.name === article.category_name)?.id ||
      "",

    // Map tag names for the combobox (allows existing + new tags)
    tag_names: normalizeTopicList(articleTags),
    is_published: article.is_published ?? true,
  };
  if (
    (!selectedArticle.value.tag_names ||
      !selectedArticle.value.tag_names.length) &&
    topicTagNames.length
  ) {
    selectedArticle.value.tag_names = topicTagNames;
  }

  editDialog.value = true;
  nextTick(() => {
    try {
      if (editPreviewRef?.value) loadTwitterWidgets(editPreviewRef.value);
    } catch (e) {
      // ignore
    }
  });
};

const handleArticleUpdate = async () => {
  loadingUpdate.value = true;
  const { valid } = await editForm.value.validate();
  if (!valid) {
    loadingUpdate.value = false;
    return;
  }

  try {
    if (!selectedArticle.value.category_id) {
      throw new Error("Category is required.");
    }

    const nextSocial = {
      ...(selectedArticle.value.rewrite_meta?.social || {}),
      facebook: {
        ...(selectedArticle.value.rewrite_meta?.social?.facebook || {}),
        caption: selectedArticle.value.social_facebook_caption || "",
      },
      instagram: {
        ...(selectedArticle.value.rewrite_meta?.social?.instagram || {}),
        caption: selectedArticle.value.social_instagram_caption || "",
      },
    };
    const summaryText = String(selectedArticle.value.summary || "").trim();
    const nextContent = upsertSummaryInHtml(
      selectedArticle.value.content,
      summaryText
    );

    const payload = {
      title: formatName(selectedArticle.value.title),
      content: nextContent,
      image_path: selectedArticle.value.image_path,
      photo_credits_url: selectedArticle.value.photo_credits_url,
      photo_credits_html: selectedArticle.value.photo_credits_html,
      original_language_code: selectedArticle.value.original_language_code
        ? String(selectedArticle.value.original_language_code).trim()
        : null,
      slug: slugify(selectedArticle.value.title),
      category_id: selectedArticle.value.category_id || null,
      type: selectedArticle.value.type || null,
      is_published: selectedArticle.value.is_published,
      rewrite_meta: {
        ...(selectedArticle.value.rewrite_meta || {}),
        template_css: sanitizeTemplateCss(selectedArticle.value.template_css),
        summary: summaryText || null,
        social: nextSocial,
      },
      newsmesh_meta: {
        ...(selectedArticle.value.newsmesh_meta || {}),
        summary: summaryText || null,
        source_summary: summaryText || null,
      },
    };

    const { error } = await updateArticle(selectedArticle.value.id, payload);
    if (error) {
      throw error;
    }

    await updateArticleTags(selectedArticle.value.id, {
      tagNames: normalizeTopicList(selectedArticle.value.tag_names || []),
    });

    if (selectedArticle.value.is_published) {
      try {
        await $fetch("/api/indexnow/article", {
          method: "POST",
          body: { articleId: selectedArticle.value.id },
        });
      } catch (err) {
        console.warn("[articles] indexnow submit failed:", err);
      }
    }

    articles.value = await getAllArticlesWithTags(false);
    toggleEditDialog(null);
  } catch (err) {
    console.error("Error updating article:", err?.message || err);
    snackbar.value = {
      show: true,
      message: err?.message || "Failed to update article.",
    };
  } finally {
    loadingUpdate.value = false;
  }
};

const isValidUrl = (value) => {
  if (!value) return true; // allow empty (optional)
  try {
    new URL(value);
    return true;
  } catch {
    return "Must be a valid URL";
  }
};
</script>

<style scoped>
.v-pagination .v-pagination__item--is-active {
  background-color: #1976d2 !important;
  color: white !important;
  border-radius: 8px;
}

.articles-wrapper {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
}

.html-preview {
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  background-color: #f8fafc;
  color: #0f172a;
  font-family: "Segoe UI", sans-serif;
  line-height: 1.6;
}

.html-preview :deep(*) {
  color: inherit;
}

.html-preview :deep(a) {
  color: #2563eb;
}

:global(.v-theme--dark) .html-preview {
  border-color: rgba(148, 163, 184, 0.45);
  background-color: #0b1220;
  color: #e2e8f0;
}

:global(.v-theme--dark) .html-preview :deep(a) {
  color: #93c5fd;
}
</style>
