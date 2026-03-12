<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title class="d-flex align-center">
      <span>Existing Categories</span>
      <v-chip class="ml-3" color="primary" variant="tonal" size="small">
        {{ categories.length }}/10
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
        class="taxonomy-sort-select mr-2"
      />
      <v-btn
        size="small"
        variant="text"
        :disabled="categories.length >= 10"
        @click="refreshData"
      >
        Refresh
      </v-btn>
    </v-card-title>
    <v-card-text>
      <LoadingContainer
        v-if="loadingCategories"
        :text="$t('pages.categories.index.loading')"
      />
      <v-table v-else density="comfortable" class="taxonomy-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th class="text-right">Articles</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in sortedCategories" :key="category.id || category.slug">
            <td class="font-weight-medium">{{ category.name }}</td>
            <td class="text-medium-emphasis">{{ category.slug || "-" }}</td>
            <td class="text-right">{{ categoryArticleCount[category.id] || 0 }}</td>
            <td>
              <div class="d-flex justify-end ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  :to="categoryRoute(category) || undefined"
                  :disabled="!categoryRoute(category)"
                >
                  View
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  @click="openEditDialog(category)"
                >
                  Edit
                </v-btn>
                <v-btn
                  icon="mdi-trash-can-outline"
                  size="small"
                  variant="text"
                  color="red"
                  @click="openEditDialog(category)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!sortedCategories.length">
            <td colspan="4" class="text-center text-medium-emphasis py-6">
              No categories found.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Create New Category</v-card-title>
    <v-card-text>
      <v-alert
        v-if="categories.length >= 10"
        type="warning"
        variant="tonal"
        class="mb-4"
      >
        You already have 10 categories. Delete one before adding another.
      </v-alert>
      <v-form @submit.prevent="handleSubmit" ref="categoryForm">
        <v-text-field
          v-model="form.name"
          label="Name"
          required
          :disabled="categories.length >= 10"
          :rules="[(v) => !!v || 'Name is required']"
        />
        <v-btn
          :loading="loading"
          :disabled="loading || categories.length >= 10"
          type="submit"
          color="primary"
          class="mt-4"
        >
          Create Category
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Edit Article Category</v-card-title>
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
        class="taxonomy-table mt-4"
      >
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Current Category</th>
            <th class="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articleSearchResults" :key="article.id">
            <td class="font-weight-medium">{{ article.title }}</td>
            <td>{{ article.is_published ? "Published" : "Draft" }}</td>
            <td class="text-medium-emphasis">
              {{ article.category?.name || "Uncategorized" }}
            </td>
            <td>
              <div class="d-flex justify-end">
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  @click="openArticleCategoryDialog(article)"
                >
                  Edit Category
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
      <v-card-title>Edit Category</v-card-title>
      <v-card-text v-if="loadingUpdate" class="text-center">
        <v-progress-circular
          indeterminate
          color="primary"
        ></v-progress-circular>
      </v-card-text>
      <v-card-text v-else>
        <v-form ref="editForm" @submit.prevent="handleUpdate">
          <v-text-field
            v-model="selectedCategory.name"
            label="Category Name"
            :rules="[(v) => !!v || 'Name is required']"
          />
        </v-form>
        <v-alert
          v-if="categories.length <= 1"
          type="info"
          variant="tonal"
          class="mt-3"
        >
          You need at least one category. Add another before deleting this one.
        </v-alert>
        <div v-else class="mt-4">
          <div class="text-subtitle-2 mb-2">Delete this category</div>
          <v-select
            v-model="fallbackCategoryId"
            :items="fallbackOptions"
            item-title="name"
            item-value="id"
            density="comfortable"
            label="Move articles to"
            :disabled="categories.length <= 1"
          />
          <v-btn
            class="mt-2"
            color="red"
            variant="tonal"
            :loading="loadingDelete"
            :disabled="categories.length <= 1"
            @click="handleDeleteCategory"
          >
            Delete Category
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn
          :disabled="loadingUpdate || !selectedCategoryRoute"
          color="primary"
          :to="selectedCategoryRoute || undefined"
          align-content-start
        >
          Go to Category Page
        </v-btn>
        <v-spacer></v-spacer>
        <v-btn
          type="submit"
          :disabled="loadingUpdate"
          color="primary"
          @click="handleUpdate"
          >Save</v-btn
        >
        <v-btn
          color="red"
          :disabled="loadingUpdate"
          @click="closeEditDialog"
          >Cancel</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="articleCategoryDialog" max-width="620px">
    <v-card>
      <v-card-title>Edit Article Category</v-card-title>
      <v-card-text>
        <div class="text-subtitle-1 font-weight-medium mb-2">
          {{ selectedArticle?.title || "Article" }}
        </div>
        <v-select
          v-model="selectedArticleCategoryId"
          :items="categoryOptions"
          item-title="name"
          item-value="id"
          label="Category"
          clearable
          :loading="savingArticleCategory"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn @click="closeArticleCategoryDialog">Cancel</v-btn>
        <v-btn
          color="primary"
          :loading="savingArticleCategory"
          @click="saveArticleCategory"
        >
          Save
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { buildTaxonomyPath, normalizeTaxonomySlug, slugifyTaxonomyName } from "@/utils/taxonomySlug";

const {
  getAllCategories,
  getTaxonomyCounts,
  insertCategory,
  updateCategory,
  updateArticleCategory,
  deleteCategoryAndReassign,
} = useDb();

const localPath = useLocalePath();

const editDialog = ref(false);
const articleCategoryDialog = ref(false);
const selectedCategory = ref({ id: null, name: "", slug: "" });
const selectedArticle = ref(null);
const selectedArticleCategoryId = ref(null);
const editForm = ref(null);

const categories = ref([]);
const loadingCategories = ref(true);
const loading = ref(false);
const loadingUpdate = ref(false);
const loadingDelete = ref(false);
const fallbackCategoryId = ref(null);
const sortMode = ref("alphabetical");
const categoryCounts = ref({});
const articleSearchQuery = ref("");
const articleSearchResults = ref([]);
const hasSearchedArticles = ref(false);
const loadingArticleSearch = ref(false);
const savingArticleCategory = ref(false);

const categoryForm = ref(null); // ref to <v-form>
const form = useState("categoryForm", () => ({
  name: "",
  slug: "",
}));

const snackbar = ref({
  show: false,
  message: "",
});

onMounted(async () => {
  await refreshData();
});

const refreshData = async () => {
  loadingCategories.value = true;
  categories.value = (await getAllCategories()) || [];
  categoryCounts.value = await getTaxonomyCounts("categories");
  loadingCategories.value = false;
};

const formatName = (name) =>
  name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const handleSubmit = async () => {
  loading.value = true;
  if (categories.value.length >= 10) {
    snackbar.value.message = "Limit reached: you already have 10 categories.";
    snackbar.value.show = true;
    loading.value = false;
    return;
  }

  const { valid } = await categoryForm.value.validate();
  if (!valid) {
    snackbar.value.message = "Please fill in the name.";
    snackbar.value.show = true;
    loading.value = false;
    return;
  }

  try {
    const formattedName = formatName(form.value.name);
    const generatedSlug = slugifyTaxonomyName(form.value.name);

    // Check for duplicate name or slug
    const duplicate = categories.value.find(
      (cat) => cat.name === formattedName || cat.slug === generatedSlug
    );

    if (duplicate) {
      snackbar.value.message = "This category already exists.";
      snackbar.value.show = true;
      loading.value = false;
      return;
    }

    const payload = {
      name: formattedName,
      slug: generatedSlug,
    };

    const res = await insertCategory(payload);

    if (res?.error) throw res.error;

    // Reset + update
    form.value.name = "";
    await nextTick();
    categoryForm.value.resetValidation();
    await refreshData();
  } catch (err) {
    console.error("Error creating category:", err.message || err);
    snackbar.value.message = "Failed to create category.";
    snackbar.value.show = true;
  } finally {
    loading.value = false;
  }
};

const openEditDialog = (category) => {
  selectedCategory.value = { ...(category || { id: null, name: "", slug: "" }) };
  fallbackCategoryId.value = null;
  editDialog.value = true;
};

const closeEditDialog = () => {
  editDialog.value = false;
  selectedCategory.value = { id: null, name: "", slug: "" };
  fallbackCategoryId.value = null;
};

const handleUpdate = async () => {
  loadingUpdate.value = true;
  const { valid } = await editForm.value.validate();
  if (!valid) return;

  const category = {
    name: formatName(selectedCategory.value.name),
    slug: slugifyTaxonomyName(selectedCategory.value.name),
  };

  await updateCategory(selectedCategory.value.slug, category);

  await refreshData();
  closeEditDialog();
  loadingUpdate.value = false;
};

const handleDeleteCategory = async () => {
  if (!fallbackCategoryId.value) {
    snackbar.value.message = "Select where to move existing articles first.";
    snackbar.value.show = true;
    return;
  }
  if (!selectedCategory.value?.id) return;

  loadingDelete.value = true;
  const { error } = await deleteCategoryAndReassign(
    selectedCategory.value.id,
    fallbackCategoryId.value
  );
  if (error) {
    snackbar.value.message = error.message || "Failed to delete category.";
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

const openArticleCategoryDialog = (article) => {
  if (!article?.id) return;
  selectedArticle.value = article;
  selectedArticleCategoryId.value = article.category?.id || null;
  articleCategoryDialog.value = true;
};

const closeArticleCategoryDialog = () => {
  articleCategoryDialog.value = false;
  selectedArticle.value = null;
  selectedArticleCategoryId.value = null;
};

const saveArticleCategory = async () => {
  if (!selectedArticle.value?.id) return;
  savingArticleCategory.value = true;
  try {
    const { error } = await updateArticleCategory(
      selectedArticle.value.id,
      selectedArticleCategoryId.value || null
    );
    if (error) {
      throw error;
    }

    const nextCategory =
      categoryOptions.value.find(
        (category) => category.id === selectedArticleCategoryId.value
      ) || null;

    articleSearchResults.value = articleSearchResults.value.map((article) =>
      article.id === selectedArticle.value.id
        ? { ...article, category: nextCategory }
        : article
    );
    categoryCounts.value = await getTaxonomyCounts("categories");
    closeArticleCategoryDialog();
  } catch (error) {
    console.error("Error saving article category:", error);
    snackbar.value.message = "Failed to save article category.";
    snackbar.value.show = true;
  } finally {
    savingArticleCategory.value = false;
  }
};

const categoryOptions = computed(() => categories.value || []);
const sortOptions = [
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Article Count", value: "article-count" },
];
const fallbackOptions = computed(() =>
  (categories.value || []).filter((c) => c.id !== selectedCategory.value.id)
);
const categoryArticleCount = computed(() => categoryCounts.value || {});
const sortedCategories = computed(() => {
  const items = [...(categories.value || [])];
  if (sortMode.value === "article-count") {
    return items.sort((a, b) => {
      const countDiff =
        (categoryArticleCount.value[b.id] || 0) - (categoryArticleCount.value[a.id] || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  return items.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );
});

const categoryRoute = (category) => {
  const slug = normalizeTaxonomySlug(category?.slug || category?.name);
  return slug ? localPath(buildTaxonomyPath("/categories", slug)) : "";
};

const selectedCategoryRoute = computed(() => {
  const slug = normalizeTaxonomySlug(
    selectedCategory.value?.slug || selectedCategory.value?.name
  );
  return slug ? localPath(buildTaxonomyPath("/categories", slug)) : "";
});
</script>

<style scoped>
.taxonomy-sort-select {
  max-width: 190px;
}

.taxonomy-table :deep(th),
.taxonomy-table :deep(td) {
  vertical-align: middle;
}

.article-search-field {
  min-width: 320px;
}
</style>
