<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title class="d-flex align-center">
      <span>Existing Categories</span>
      <v-chip class="ml-3" color="primary" variant="tonal" size="small">
        {{ categories.length }}/10
      </v-chip>
      <v-spacer></v-spacer>
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
      <div v-else class="d-flex flex-wrap ga-2">
        <v-chip
          v-for="cat in categories"
          :key="cat.slug"
          class="ma-1"
          color="primary"
          variant="outlined"
          @click="toggleEditDialog(cat)">
          {{ cat.name }}
          <v-chip
            v-if="categoryArticleCount[cat.id]"
            size="x-small"
            class="ml-2"
            color="primary"
            variant="tonal"
          >
            {{ categoryArticleCount[cat.id] }}
          </v-chip>
        </v-chip>
      </div>
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
    <v-card-title>Assign Categories to Articles</v-card-title>
    <v-card-text>
      <LoadingContainer
        v-if="loadingArticles"
        text="Loading articles..."
      />
      <template v-else>
        <v-list lines="two" class="article-list">
          <v-list-item
            v-for="article in articles"
            :key="article.id"
            class="article-item"
          >
            <v-list-item-title class="text-subtitle-1">
              {{ article.title }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              Current: {{ article.category?.name || 'Uncategorized' }}
            </v-list-item-subtitle>
            <template #append>
              <v-select
                :items="categoryOptions"
                item-title="name"
                item-value="id"
                density="compact"
                hide-details
                class="category-select"
                label="Assign Category"
                :model-value="article.category?.id || null"
                :loading="updatingArticleId === article.id"
                @update:model-value="(val) => handleArticleCategoryChange(article.id, val)"
              />
            </template>
          </v-list-item>
        </v-list>
      </template>
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
          :disabled="loadingUpdate"
          color="primary"
          :to="`/categories/${selectedCategory.slug}`"
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
          @click="toggleEditDialog(null)"
          >Cancel</v-btn
        >
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
const {
  getAllCategories,
  getAllArticlesWithTags,
  insertCategory,
  updateCategory,
  updateArticleCategory,
  deleteCategoryAndReassign,
} = useDb();

const editDialog = ref(false);
const selectedCategory = ref({ id: null, name: "", slug: "" });
const editForm = ref(null);

const categories = ref([]);
const articles = ref([]);
const loadingCategories = ref(true);
const loadingArticles = ref(true);
const loading = ref(false);
const loadingUpdate = ref(false);
const loadingDelete = ref(false);
const updatingArticleId = ref(null);
const fallbackCategoryId = ref(null);

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
  loadingArticles.value = true;
  categories.value = (await getAllCategories()) || [];
  articles.value = (await getAllArticlesWithTags()) || [];
  loadingCategories.value = false;
  loadingArticles.value = false;
};

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
    const generatedSlug = slugify(form.value.name);

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

const toggleEditDialog = (category) => {
  selectedCategory.value = { ...category };
  fallbackCategoryId.value = null;
  editDialog.value = !editDialog.value;
};

const handleUpdate = async () => {
  loadingUpdate.value = true;
  const { valid } = await editForm.value.validate();
  if (!valid) return;

  const category = {
    name: formatName(selectedCategory.value.name),
    slug: slugify(selectedCategory.value.name),
  };

  await updateCategory(selectedCategory.value.slug, category);

  await refreshData();
  toggleEditDialog(null);
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
    toggleEditDialog(null);
  }
  loadingDelete.value = false;
};

const handleArticleCategoryChange = async (articleId, categoryId) => {
  if (!categoryId || !articleId) return;
  updatingArticleId.value = articleId;
  const { error } = await updateArticleCategory(articleId, categoryId);
  if (error) {
    snackbar.value.message = "Failed to update article category.";
    snackbar.value.show = true;
  } else {
    articles.value = (await getAllArticlesWithTags()) || [];
  }
  updatingArticleId.value = null;
};

const categoryOptions = computed(() => categories.value || []);
const fallbackOptions = computed(() =>
  (categories.value || []).filter((c) => c.id !== selectedCategory.value.id)
);
const categoryArticleCount = computed(() => {
  const counts = {};
  (articles.value || []).forEach((article) => {
    const id = article.category?.id;
    if (!id) return;
    counts[id] = (counts[id] || 0) + 1;
  });
  return counts;
});
</script>

<style scoped>
.article-list {
  max-height: 520px;
  overflow-y: auto;
}

.article-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.category-select {
  min-width: 220px;
}
</style>
