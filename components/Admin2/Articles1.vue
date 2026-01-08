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
  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Create New Article</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="handleSubmit" ref="articleForm">
        <!-- Image Preview -->
        <NuxtImg
          v-if="uploadedImagePath"
          :src="`${config.public.SUPABASE_BUCKET}/articles/${uploadedImagePath}`"
          width="150"
          height="auto"
          class="mt-2 rounded"
        />

        <!-- Image Upload -->
        <v-file-input
          accept="image/*"
          label="Upload Image"
          show-size
          @update:modelValue="handleImageChange"
        />

        <!-- Photo Credit URL -->
        <v-text-field
          v-if="uploadedImagePath"
          v-model="form.photo_credits_url"
          label="Photo Credit URL"
          :rules="[isValidUrl]"
        />
        <v-textarea
          v-if="uploadedImagePath"
          v-model="form.photo_credits_html"
          label="Photo Credit HTML (shown on article page)"
          rows="3"
          auto-grow
          hint="Example: &lt;a href='...'>Photographer&lt;/a>, Public domain, via ..."
          persistent-hint
        />
        <v-text-field
          v-model="form.title"
          label="Title"
          required
          :rules="[(v) => !!v || 'Title is required']"
        />
        <v-select
          v-model="form.category_id"
          :items="categories"
          item-title="name"
          item-value="id"
          label="Category"
          :rules="[(v) => !!v || 'Category is required']"
          required
        />

        <v-select
          v-model="form.tag_ids"
          :items="tags"
          item-title="name"
          item-value="id"
          label="Tags"
          multiple
          chips
          :rules="[(v) => v.length > 0 || 'At least one tag is required']"
        />

        <v-select
          v-model="form.type"
          :items="types"
          item-title="name"
          item-value="id"
          label="Type"
          :rules="[(v) => v.length > 0 || 'Pick a type']"
          required
        />

        <!-- HTML Content Editor -->
        <v-textarea
          v-model="form.content"
          label="HTML Content"
          rows="10"
          auto-grow
          class="mb-4"
          placeholder="<h2>Hello</h2><p>This is an article</p>"
          :rules="[(v) => !!v || 'Content is required']"
        />

        <v-divider class="my-4" />
        <div class="text-subtitle-1 mb-2">Insert Inline Image</div>
        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="inlineImageAlt"
              label="Image alt text"
              placeholder="Describe the image"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="inlineImageCaption"
              label="Caption (optional)"
              placeholder="Photo credit or caption"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="inlineImageWidth"
              label="Width (optional)"
              placeholder="e.g. 320px or 60%"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="inlineImageHeight"
              label="Height (optional)"
              placeholder="e.g. 180px"
            />
          </v-col>
          <v-col cols="12">
            <v-file-input
              accept="image/*"
              label="Upload inline image"
              show-size
              @update:modelValue="handleInlineImageInsert"
            />
          </v-col>
        </v-row>

        <!-- Live Preview -->
        <div class="html-preview" v-html="form.content" ref="createPreviewRef"></div>

        <v-switch
          v-model="form.is_published"
          label="Published"
          color="primary"
        />
        <v-btn
          :loading="loading"
          :disabled="loading"
          type="submit"
          color="primary"
          class="mt-4"
        >
          Create Article
        </v-btn>
      </v-form>
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

          <v-select
            v-model="selectedArticle.tag_ids"
            :items="tags"
            item-title="name"
            item-value="id"
            label="Tags"
            multiple
            chips
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
</template>

<script setup>
import { useI18n } from "vue-i18n";
const { t } = useI18n();
import { useDisplay } from "vuetify";
import { nextTick, watch } from "vue";
import { loadTwitterWidgets } from "@/composables/useTwitterWidgets.js";
const {
  getAllArticlesWithTags,
  getAllCategories,
  getAllTags,
  insertArticle,
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
const loading = ref(false);
const loadingArticles = ref(true);

const currentPage = ref(1);
const config = useRuntimeConfig();
const { md, smAndDown, xs } = useDisplay();
const uploadedImagePath = ref(""); // used to preview image and show URL field before final submit
const inlineImageAlt = ref("");
const inlineImageCaption = ref("");
const inlineImageWidth = ref("");
const inlineImageHeight = ref("");
const createPreviewRef = ref(null);
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

const articleForm = ref(null); // ref to <v-form>
const form = useState("articleForm", () => ({
  title: "",
  slug: "",
  category_id: "",
  tag_ids: [],
  content: "",
  is_published: true,
  type: "",
  image_path: "",
  photo_credits_url: "",
  photo_credits_html: "",
}));

const snackbar = ref({
  show: false,
  message: "",
});


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
    snackbar.value = { show: true, message: 'Published to chat ✅' }
  } catch (e) {
    console.error('[admin] publishToChat', e)
    snackbar.value = { show: true, message: `Publish failed: ${e.message || e}` }
  }
}


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
      snackbar.value = { show: true, message: 'Published to chat ✅' }
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

// const handleImageChange = async (file) => {
//   if (!file) return;

//   const imagePath = await uploadArticleImage(file);
//   if (imagePath) {
//     form.value.image_path = imagePath;
//   }
// };

const handleImageChange = async (file) => {
  // console.log("Selected file:", file);

  if (!file || !file.name) {
    console.warn("Invalid file:", file);
    return;
  }

  const imagePath = await uploadArticleImage(file);
  // console.log("Returned image path:", imagePath);

  if (imagePath) {
    uploadedImagePath.value = imagePath;
    form.value.image_path = imagePath;
    // console.log("Image path set:", uploadedImagePath.value);
  } else {
    console.warn("Upload failed or returned null.");
  }
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

const handleInlineImageInsert = async (file) => {
  if (!file || !file.name) return;
  const imagePath = await uploadArticleImage(file);
  if (!imagePath) return;
  const html = buildInlineImageHtml(
    imagePath,
    inlineImageAlt.value,
    inlineImageCaption.value,
    inlineImageWidth.value,
    inlineImageHeight.value
  );
  form.value.content = appendHtml(form.value.content, html);
  inlineImageAlt.value = "";
  inlineImageCaption.value = "";
  inlineImageWidth.value = "";
  inlineImageHeight.value = "";
};

// Watch create form content and trigger twitter widget load on updates
watch(
  () => form.value.content,
  () => {
    nextTick(() => {
      try {
        if (createPreviewRef?.value) loadTwitterWidgets(createPreviewRef.value);
      } catch (e) {
        // ignore
      }
    });
  }
);

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

const handleSubmit = async () => {
  loading.value = true;
  const { valid } = await articleForm.value.validate();
  console.log("form validation", valid);
  if (!valid) {
    console.error("Form validation failed");
    snackbar.value.message = "Please fill in all required fields.";
    snackbar.value.show = true;
    loading.value = false;
    return;
  }

  try {
    form.value.title = formatName(form.value.title);
    form.value.slug = slugify(form.value.title);

    // Check for duplicate name or slug
    const duplicate = articles.value.find(
      (art) => art.title === form.value.title || art.slug === form.value.slug
    );

    if (duplicate) {
      snackbar.value.message = "This article name already exists.";
      snackbar.value.show = true;
      loading.value = false;
      return;
    }

    const res = await insertArticle(form.value);
    if (res?.error) throw res.error;

    // Reset + update
    articleForm.value.reset();
    await nextTick();
    articleForm.value.resetValidation();
    articles.value = await getAllArticlesWithTags(false);
  } catch (err) {
    console.error("Error creating article:", err.message || err);
    snackbar.value.message = "Failed to create article.";
    snackbar.value.show = true;
  } finally {
    loading.value = false;
  }
};

const toggleEditDialog = (article) => {
  if (!article) {
    editDialog.value = false;
    selectedArticle.value = {};
    return;
  }

  const existingSocial = article.rewrite_meta?.social || {};
  selectedArticle.value = {
    id: article.id,
    title: article.title,
    content: article.content,
    image_path: article.image_path,
    photo_credits_url: article.photo_credits_url,
    photo_credits_html: article.photo_credits_html,
    slug: article.slug,
    type: article.type || "",
    rewrite_meta: article.rewrite_meta || {},
    social_facebook_caption: existingSocial?.facebook?.caption || "",
    social_instagram_caption: existingSocial?.instagram?.caption || "",

    // Get the category ID based on the name
    category_id:
      categories.value.find((cat) => cat.name === article.category_name)?.id ||
      "",

    // Map tag names to their corresponding IDs
    tag_ids: (article.tags || [])
      .map((tagEntry) => findTagIdFromArticleTag(tagEntry))
      .filter(Boolean), // remove any nulls
    is_published: article.is_published ?? true,
  };

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

    const payload = {
      title: formatName(selectedArticle.value.title),
      content: selectedArticle.value.content,
      image_path: selectedArticle.value.image_path,
      photo_credits_url: selectedArticle.value.photo_credits_url,
      photo_credits_html: selectedArticle.value.photo_credits_html,
      slug: slugify(selectedArticle.value.title),
      category_id: selectedArticle.value.category_id || null,
      type: selectedArticle.value.type || null,
      is_published: selectedArticle.value.is_published,
      rewrite_meta: {
        ...(selectedArticle.value.rewrite_meta || {}),
        social: nextSocial,
      },
    };

    const { error } = await updateArticle(selectedArticle.value.id, payload);
    if (error) {
      throw error;
    }

    await updateArticleTags(
      selectedArticle.value.id,
      selectedArticle.value.tag_ids
    );

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
  border: 1px solid #ccc;
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
  background-color: #fafafa;
  font-family: "Segoe UI", sans-serif;
  line-height: 1.6;
}
</style>
