<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title class="d-flex align-center">
      <span>Existing Tags</span>
      <v-chip class="ml-3" color="primary" variant="tonal" size="small">
        {{ tags.length }}
      </v-chip>
      <v-spacer></v-spacer>
      <v-select
        v-model="sortMode"
        :items="sortOptions"
        item-title="label"
        item-value="value"
        density="compact"
        hide-details
        label="Sort"
        class="tag-sort-select mr-2"
      />
      <v-btn size="small" variant="text" @click="refreshData">Refresh</v-btn>
    </v-card-title>
    <v-card-text>
      <LoadingContainer v-if="loadingTags" text="Loading tags..." />
      <v-table v-else density="comfortable" class="tag-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th class="text-right">Articles</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="tag in sortedTags" :key="tag.id || tag.slug">
            <td class="font-weight-medium">
              <NuxtLink
                :to="tagRoute(tag) || undefined"
                class="taxonomy-name-link"
              >
                {{ tag.name }}
              </NuxtLink>
            </td>
            <td class="text-medium-emphasis">{{ tag.slug || "-" }}</td>
            <td class="text-right">{{ tagArticleCount[tag.id] || 0 }}</td>
            <td>
              <div class="d-flex justify-end ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  :to="tagRoute(tag) || undefined"
                  :disabled="!tagRoute(tag)"
                >
                  View
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  @click="openEditDialog(tag)"
                >
                  Edit
                </v-btn>
                <v-btn
                  icon="mdi-trash-can-outline"
                  size="small"
                  variant="text"
                  color="red"
                  :loading="loadingDelete && selectedTag?.id === tag.id"
                  @click="handleRowDelete(tag)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!sortedTags.length">
            <td colspan="4" class="text-center text-medium-emphasis py-6">
              No tags found.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Create New Tag</v-card-title>
    <v-card-text>
      <v-form ref="tagForm" @submit.prevent="handleSubmit">
        <v-text-field
          v-model="form.name"
          label="Name"
          required
          :rules="[(v) => !!String(v || '').trim() || 'Name is required']"
        />
        <v-btn
          :loading="loading"
          :disabled="loading"
          type="submit"
          color="primary"
          class="mt-4"
        >
          Create Tag
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Edit Article Tags</v-card-title>
    <v-card-text>
      <div class="d-flex flex-wrap ga-3 align-end">
        <v-text-field
          v-model="articleSearchQuery"
          label="Search articles by title"
          class="article-search-field"
          hide-details
          @keydown.enter.prevent="searchArticles"
        />
        <v-btn
          color="primary"
          :loading="loadingArticleSearch"
          @click="searchArticles"
        >
          Search
        </v-btn>
      </div>

      <div class="text-caption text-medium-emphasis mt-2">
        Search only when you need to edit an article. This avoids loading the full article catalog.
      </div>

      <LoadingContainer
        v-if="loadingArticleSearch"
        text="Searching articles..."
        class="mt-4"
      />

      <v-table
        v-else-if="articleSearchResults.length"
        density="comfortable"
        class="tag-table mt-4"
      >
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Current Tags</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articleSearchResults" :key="article.id">
            <td class="font-weight-medium">{{ article.title }}</td>
            <td>{{ article.is_published ? "Published" : "Draft" }}</td>
            <td class="text-medium-emphasis">
              {{ article.tags?.map((tag) => tag.name).join(", ") || "No tags" }}
            </td>
            <td>
              <div class="d-flex justify-end">
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  @click="openArticleTagDialog(article)"
                >
                  Edit Tags
                </v-btn>
              </div>
            </td>
          </tr>
        </tbody>
      </v-table>

      <div
        v-else-if="hasSearchedArticles"
        class="text-medium-emphasis mt-4"
      >
        No articles found.
      </div>
    </v-card-text>
  </v-card>

  <v-snackbar
    v-model="snackbar.show"
    :timeout="3500"
    color="red"
    location="top"
  >
    {{ snackbar.message }}
  </v-snackbar>

  <v-dialog v-model="editDialog" max-width="520px">
    <v-card>
      <v-card-title>Edit Tag</v-card-title>
      <v-card-text v-if="loadingUpdate" class="text-center">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>
      <v-card-text v-else>
        <v-form ref="editForm" @submit.prevent="handleUpdate">
          <v-text-field
            v-model="selectedTag.name"
            label="Tag Name"
            :rules="[(v) => !!String(v || '').trim() || 'Name is required']"
          />
        </v-form>
        <v-alert
          v-if="tags.length <= 1"
          type="info"
          variant="tonal"
          class="mt-3"
        >
          You need at least one tag. Add another before deleting this one.
        </v-alert>
        <div v-else class="mt-4">
          <div class="text-subtitle-2 mb-2">Delete this tag</div>
          <v-select
            v-model="fallbackTagId"
            :items="fallbackOptions"
            item-title="name"
            item-value="id"
            density="comfortable"
            label="Move article links to"
          />
          <v-btn
            class="mt-2"
            color="red"
            variant="tonal"
            :loading="loadingDelete"
            @click="handleDeleteTag"
          >
            Delete Tag
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn
          :disabled="loadingUpdate || !selectedTagRoute"
          color="primary"
          :to="selectedTagRoute || undefined"
        >
          Go to Tag Page
        </v-btn>
        <v-spacer />
        <v-btn
          type="submit"
          :disabled="loadingUpdate"
          color="primary"
          @click="handleUpdate"
        >
          Save
        </v-btn>
        <v-btn color="red" :disabled="loadingUpdate" @click="closeEditDialog">
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="articleTagDialog" max-width="720px">
    <v-card>
      <v-card-title>Edit Article Tags</v-card-title>
      <v-card-text>
        <div class="text-subtitle-1 font-weight-medium mb-2">
          {{ selectedArticle?.title || "Article" }}
        </div>
        <v-select
          v-model="selectedArticleTagIds"
          :items="tagOptions"
          item-title="name"
          item-value="id"
          label="Tags"
          multiple
          chips
          closable-chips
          :loading="loadingArticleTags"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeArticleTagDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="savingArticleTags"
          @click="saveArticleTags"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import LoadingContainer from "../LoadingContainer.vue";
import { buildTaxonomyPath, normalizeTaxonomySlug, slugifyTaxonomyName } from "@/utils/taxonomySlug";

const localPath = useLocalePath();
const {
  getAllTags,
  getTagsByArticleId,
  getTaxonomyCounts,
  insertTag,
  updateTag,
  updateArticleTags,
  deleteTag,
  deleteTagAndReassign,
} = useDb();

const editDialog = ref(false);
const articleTagDialog = ref(false);
const selectedTag = ref({ id: null, name: "", slug: "" });
const selectedArticle = ref(null);
const selectedArticleTagIds = ref([]);
const editForm = ref(null);
const tagForm = ref(null);

const tags = ref([]);
const loadingTags = ref(true);
const loading = ref(false);
const loadingUpdate = ref(false);
const loadingDelete = ref(false);
const fallbackTagId = ref(null);
const sortMode = ref("alphabetical");
const tagCounts = ref({});
const articleSearchQuery = ref("");
const articleSearchResults = ref([]);
const hasSearchedArticles = ref(false);
const loadingArticleSearch = ref(false);
const loadingArticleTags = ref(false);
const savingArticleTags = ref(false);

const form = useState("tagForm", () => ({
  name: "",
}));

const snackbar = ref({
  show: false,
  message: "",
});

onMounted(async () => {
  await refreshData();
});

const formatName = (name) =>
  String(name || "")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();

const refreshData = async () => {
  loadingTags.value = true;
  tags.value = (await getAllTags()) || [];
  tagCounts.value = await getTaxonomyCounts("tags");
  loadingTags.value = false;
};

const openEditDialog = (tag) => {
  selectedTag.value = { ...(tag || { id: null, name: "", slug: "" }) };
  fallbackTagId.value = null;
  editDialog.value = true;
};

const closeEditDialog = () => {
  editDialog.value = false;
  selectedTag.value = { id: null, name: "", slug: "" };
  fallbackTagId.value = null;
};

const handleRowDelete = async (tag) => {
  if (!tag?.id) return;

  const articleCount = tagArticleCount.value[tag.id] || 0;
  if (articleCount > 0) {
    openEditDialog(tag);
    return;
  }

  selectedTag.value = { ...(tag || { id: null, name: "", slug: "" }) };
  loadingDelete.value = true;
  const { error } = await deleteTag(tag.id);
  if (error) {
    snackbar.value.message = error.message || "Failed to delete tag.";
    snackbar.value.show = true;
  } else {
    await refreshData();
  }
  closeEditDialog();
  loadingDelete.value = false;
};

const handleSubmit = async () => {
  loading.value = true;
  const { valid } = await tagForm.value.validate();
  if (!valid) {
    snackbar.value.message = "Please fill in the name.";
    snackbar.value.show = true;
    loading.value = false;
    return;
  }

  try {
    const formattedName = formatName(form.value.name);
    const generatedSlug = slugifyTaxonomyName(form.value.name);

    const duplicate = tags.value.find(
      (tag) => tag.name === formattedName || tag.slug === generatedSlug
    );

    if (duplicate) {
      snackbar.value.message = "This tag already exists.";
      snackbar.value.show = true;
      loading.value = false;
      return;
    }

    const error = await insertTag({
      name: formattedName,
      slug: generatedSlug,
    });

    if (error) throw error;

    form.value.name = "";
    await nextTick();
    tagForm.value.resetValidation();
    await refreshData();
  } catch (err) {
    console.error("Error creating tag:", err?.message || err);
    snackbar.value.message = "Failed to create tag.";
    snackbar.value.show = true;
  } finally {
    loading.value = false;
  }
};

const handleUpdate = async () => {
  loadingUpdate.value = true;
  const { valid } = await editForm.value.validate();
  if (!valid) {
    loadingUpdate.value = false;
    return;
  }

  try {
    const nextName = formatName(selectedTag.value.name);
    const nextSlug = slugifyTaxonomyName(selectedTag.value.name);
    const duplicate = tags.value.find(
      (tag) =>
        tag.id !== selectedTag.value.id &&
        (tag.name === nextName || tag.slug === nextSlug)
    );

    if (duplicate) {
      snackbar.value.message = "Another tag already uses that name or slug.";
      snackbar.value.show = true;
      loadingUpdate.value = false;
      return;
    }

    await updateTag(selectedTag.value.slug, {
      name: nextName,
      slug: nextSlug,
    });

    await refreshData();
    closeEditDialog();
  } finally {
    loadingUpdate.value = false;
  }
};

const handleDeleteTag = async () => {
  if (!fallbackTagId.value) {
    snackbar.value.message = "Select where to move existing article links first.";
    snackbar.value.show = true;
    return;
  }
  if (!selectedTag.value?.id) return;

  loadingDelete.value = true;
  const { error } = await deleteTagAndReassign(
    selectedTag.value.id,
    fallbackTagId.value
  );
  if (error) {
    snackbar.value.message = error.message || "Failed to delete tag.";
    snackbar.value.show = true;
  } else {
    await refreshData();
    closeEditDialog();
  }
  loadingDelete.value = false;
};

const searchArticles = async () => {
  loadingArticleSearch.value = true;
  hasSearchedArticles.value = true;
  try {
    const response = await $fetch("/api/admin/articles/search", {
      method: "GET",
      query: {
        q: articleSearchQuery.value,
        limit: 20,
      },
    });
    if (!response?.success) {
      throw new Error(response?.error || "Unable to search articles.");
    }
    articleSearchResults.value = response.articles || [];
  } catch (error) {
    console.error("Error searching articles:", error);
    snackbar.value.message = "Failed to search articles.";
    snackbar.value.show = true;
  } finally {
    loadingArticleSearch.value = false;
  }
};

const openArticleTagDialog = async (article) => {
  if (!article?.id) return;
  selectedArticle.value = article;
  selectedArticleTagIds.value = [];
  articleTagDialog.value = true;
  loadingArticleTags.value = true;

  try {
    const currentTags = await getTagsByArticleId(article.id);
    selectedArticleTagIds.value = (currentTags || [])
      .map((tag) => tag?.id)
      .filter(Boolean);
  } catch (error) {
    console.error("Error loading article tags:", error);
    snackbar.value.message = "Failed to load article tags.";
    snackbar.value.show = true;
  } finally {
    loadingArticleTags.value = false;
  }
};

const closeArticleTagDialog = () => {
  articleTagDialog.value = false;
  selectedArticle.value = null;
  selectedArticleTagIds.value = [];
};

const saveArticleTags = async () => {
  if (!selectedArticle.value?.id) return;
  savingArticleTags.value = true;
  try {
    await updateArticleTags(selectedArticle.value.id, selectedArticleTagIds.value);
    const currentTags = await getTagsByArticleId(selectedArticle.value.id);
    articleSearchResults.value = articleSearchResults.value.map((article) =>
      article.id === selectedArticle.value.id
        ? { ...article, tags: currentTags || [] }
        : article
    );
    tagCounts.value = await getTaxonomyCounts("tags");
    closeArticleTagDialog();
  } catch (error) {
    console.error("Error saving article tags:", error);
    snackbar.value.message = "Failed to save article tags.";
    snackbar.value.show = true;
  } finally {
    savingArticleTags.value = false;
  }
};

const tagOptions = computed(() => tags.value || []);
const sortOptions = [
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Article Count", value: "article-count" },
];
const fallbackOptions = computed(() =>
  (tags.value || []).filter((tag) => tag.id !== selectedTag.value.id)
);
const tagArticleCount = computed(() => tagCounts.value || {});
const sortedTags = computed(() => {
  const items = [...(tags.value || [])];
  if (sortMode.value === "article-count") {
    return items.sort((a, b) => {
      const countDiff = (tagArticleCount.value[b.id] || 0) - (tagArticleCount.value[a.id] || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  return items.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );
});
const tagRoute = (tag) => {
  const slug = normalizeTaxonomySlug(tag?.slug || tag?.name);
  return slug ? localPath(buildTaxonomyPath("/tags", slug)) : "";
};
const selectedTagRoute = computed(() => {
  const slug = normalizeTaxonomySlug(selectedTag.value?.slug || selectedTag.value?.name);
  return slug ? localPath(buildTaxonomyPath("/tags", slug)) : "";
});
</script>

<style scoped>
.tag-sort-select {
  max-width: 190px;
}

.tag-table :deep(th),
.tag-table :deep(td) {
  vertical-align: middle;
}

.taxonomy-name-link {
  color: inherit;
  text-decoration: none;
}

.taxonomy-name-link:hover {
  text-decoration: underline;
}

.article-search-field {
  min-width: 320px;
}
</style>
