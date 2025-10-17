<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title>Existing Categories</v-card-title>
    <v-card-text>
      <LoadingContainer
        v-if="loadingCategories"
        :text="$t('pages.categories.index.loading')"
      />
      <v-chip
        v-for="cat in categories"
        :key="cat.slug"
        class="ma-1"
        color="primary"
        variant="outlined"
        @click="toggleEditDialog(cat)"
      >
        {{ cat.name }}
      </v-chip>
    </v-card-text>
  </v-card>
  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Create New Category</v-card-title>
    <v-card-text>
      <v-form @submit.prevent="handleSubmit" ref="categoryForm">
        <v-text-field
          v-model="form.name"
          label="Name"
          required
          :rules="[(v) => !!v || 'Name is required']"
        />
        <v-btn
          :loading="loading"
          :disabled="loading"
          type="submit"
          color="primary"
          class="mt-4"
        >
          Create Category
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

  <v-dialog v-model="editDialog" max-width="500px">
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
const { getAllCategories, insertCategory, updateCategory } = useDb();

const editDialog = ref(false);
const selectedCategory = ref({ name: "", slug: "" });
const editForm = ref(null);

const categories = ref([]);
const loadingCategories = ref(true);
const loading = ref(false);
const loadingUpdate = ref(false);

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
  categories.value = (await getAllCategories()) || [];
  loadingCategories.value = false;
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

const handleSubmit = async () => {
  loading.value = true;
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
    categories.value = (await getAllCategories()) || [];
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

  categories.value = (await getAllCategories()) || [];
  toggleEditDialog(null);
  loadingUpdate.value = false;
};
</script>
