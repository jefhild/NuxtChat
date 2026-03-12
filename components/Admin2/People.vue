<template>
  <v-card class="pa-6" elevation="3">
    <v-card-title class="d-flex align-center">
      <span>Existing People</span>
      <v-chip class="ml-3" color="primary" variant="tonal" size="small">
        {{ people.length }}
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
      <v-btn size="small" variant="text" @click="refreshData">Refresh</v-btn>
    </v-card-title>
    <v-card-text>
      <LoadingContainer v-if="loadingPeople" text="Loading people..." />
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
          <tr v-for="person in sortedPeople" :key="person.id || person.slug">
            <td class="font-weight-medium">{{ person.name }}</td>
            <td class="text-medium-emphasis">{{ person.slug || "-" }}</td>
            <td class="text-right">{{ personArticleCount[person.id] || 0 }}</td>
            <td>
              <div class="d-flex justify-end ga-2">
                <v-btn
                  size="small"
                  variant="text"
                  color="primary"
                  :to="personRoute(person) || undefined"
                  :disabled="!personRoute(person)"
                >
                  View
                </v-btn>
                <v-btn
                  size="small"
                  variant="tonal"
                  color="primary"
                  @click="openEditDialog(person)"
                >
                  Edit
                </v-btn>
                <v-btn
                  icon="mdi-trash-can-outline"
                  size="small"
                  variant="text"
                  color="red"
                  @click="openEditDialog(person)"
                />
              </div>
            </td>
          </tr>
          <tr v-if="!sortedPeople.length">
            <td colspan="4" class="text-center text-medium-emphasis py-6">
              No people found.
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Create New Person</v-card-title>
    <v-card-text>
      <v-form ref="personForm" @submit.prevent="handleSubmit">
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
          Create Person
        </v-btn>
      </v-form>
    </v-card-text>
  </v-card>

  <v-card class="pa-6 mt-5" elevation="3">
    <v-card-title>Assign People to Articles</v-card-title>
    <v-card-text>
      <LoadingContainer v-if="loadingArticles" text="Loading articles..." />
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
              Current:
              {{
                article.people?.map((person) => person.name).join(", ") ||
                "No people"
              }}
            </v-list-item-subtitle>
            <template #append>
              <v-select
                :items="peopleOptions"
                item-title="name"
                item-value="id"
                density="compact"
                hide-details
                class="taxonomy-select"
                label="Assign People"
                multiple
                chips
                closable-chips
                :model-value="articlePersonIds(article)"
                :loading="updatingArticleId === article.id"
                @update:model-value="(val) => handleArticlePeopleChange(article.id, val)"
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
      <v-card-title>Edit Person</v-card-title>
      <v-card-text v-if="loadingUpdate" class="text-center">
        <v-progress-circular indeterminate color="primary" />
      </v-card-text>
      <v-card-text v-else>
        <v-form ref="editForm" @submit.prevent="handleUpdate">
          <v-text-field
            v-model="selectedPerson.name"
            label="Person Name"
            :rules="[(v) => !!String(v || '').trim() || 'Name is required']"
          />
        </v-form>
        <v-alert
          v-if="people.length <= 1"
          type="info"
          variant="tonal"
          class="mt-3"
        >
          You need at least one person. Add another before deleting this one.
        </v-alert>
        <div v-else class="mt-4">
          <div class="text-subtitle-2 mb-2">Delete this person</div>
          <v-select
            v-model="fallbackPersonId"
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
            @click="handleDeletePerson"
          >
            Delete Person
          </v-btn>
        </div>
      </v-card-text>
      <v-card-actions>
        <v-btn
          :disabled="loadingUpdate || !selectedPersonRoute"
          color="primary"
          :to="selectedPersonRoute || undefined"
        >
          Go to Person Page
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
</template>

<script setup>
import LoadingContainer from "../LoadingContainer.vue";
import { buildTaxonomyPath, normalizeTaxonomySlug, slugifyTaxonomyName } from "@/utils/taxonomySlug";

const localPath = useLocalePath();
const {
  getAllPeople,
  getAllArticlesWithTags,
  getTaxonomyCounts,
  getCountArticleByPerson,
  insertPerson,
  updatePerson,
  updateArticlePeople,
  deletePersonAndReassign,
} = useDb();

const editDialog = ref(false);
const selectedPerson = ref({ id: null, name: "", slug: "" });
const editForm = ref(null);
const personForm = ref(null);

const people = ref([]);
const articles = ref([]);
const loadingPeople = ref(true);
const loadingArticles = ref(true);
const loading = ref(false);
const loadingUpdate = ref(false);
const loadingDelete = ref(false);
const updatingArticleId = ref(null);
const fallbackPersonId = ref(null);
const sortMode = ref("alphabetical");
const personCounts = ref({});

const form = useState("personForm", () => ({
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
  loadingPeople.value = true;
  loadingArticles.value = true;
  people.value = (await getAllPeople()) || [];
  articles.value = (await getAllArticlesWithTags()) || [];
  const groupedCounts = await getTaxonomyCounts("people");
  if (Object.keys(groupedCounts || {}).length > 0) {
    personCounts.value = groupedCounts;
  } else {
    personCounts.value = Object.fromEntries(
      await Promise.all(
        (people.value || []).map(async (person) => [
          person.id,
          await getCountArticleByPerson(person.id),
        ])
      )
    );
  }
  loadingPeople.value = false;
  loadingArticles.value = false;
};

const openEditDialog = (person) => {
  selectedPerson.value = { ...(person || { id: null, name: "", slug: "" }) };
  fallbackPersonId.value = null;
  editDialog.value = true;
};

const closeEditDialog = () => {
  editDialog.value = false;
  selectedPerson.value = { id: null, name: "", slug: "" };
  fallbackPersonId.value = null;
};

const articlePersonIds = (article) =>
  (article?.people || []).map((person) => person.id).filter(Boolean);

const handleSubmit = async () => {
  loading.value = true;
  const { valid } = await personForm.value.validate();
  if (!valid) {
    snackbar.value.message = "Please fill in the name.";
    snackbar.value.show = true;
    loading.value = false;
    return;
  }

  try {
    const formattedName = formatName(form.value.name);
    const generatedSlug = slugifyTaxonomyName(form.value.name);

    const duplicate = people.value.find(
      (person) => person.name === formattedName || person.slug === generatedSlug
    );

    if (duplicate) {
      snackbar.value.message = "This person already exists.";
      snackbar.value.show = true;
      loading.value = false;
      return;
    }

    const error = await insertPerson({
      name: formattedName,
      slug: generatedSlug,
    });

    if (error) throw error;

    form.value.name = "";
    await nextTick();
    personForm.value.resetValidation();
    await refreshData();
  } catch (err) {
    console.error("Error creating person:", err?.message || err);
    snackbar.value.message = "Failed to create person.";
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
    const nextName = formatName(selectedPerson.value.name);
    const nextSlug = slugifyTaxonomyName(selectedPerson.value.name);
    const duplicate = people.value.find(
      (person) =>
        person.id !== selectedPerson.value.id &&
        (person.name === nextName || person.slug === nextSlug)
    );

    if (duplicate) {
      snackbar.value.message = "Another person already uses that name or slug.";
      snackbar.value.show = true;
      loadingUpdate.value = false;
      return;
    }

    await updatePerson(selectedPerson.value.slug, {
      name: nextName,
      slug: nextSlug,
    });

    await refreshData();
    closeEditDialog();
  } finally {
    loadingUpdate.value = false;
  }
};

const handleDeletePerson = async () => {
  if (!fallbackPersonId.value) {
    snackbar.value.message = "Select where to move existing article links first.";
    snackbar.value.show = true;
    return;
  }
  if (!selectedPerson.value?.id) return;

  loadingDelete.value = true;
  const { error } = await deletePersonAndReassign(
    selectedPerson.value.id,
    fallbackPersonId.value
  );
  if (error) {
    snackbar.value.message = error.message || "Failed to delete person.";
    snackbar.value.show = true;
  } else {
    await refreshData();
    closeEditDialog();
  }
  loadingDelete.value = false;
};

const handleArticlePeopleChange = async (articleId, personIds) => {
  if (!articleId) return;
  updatingArticleId.value = articleId;
  try {
    await updateArticlePeople(articleId, personIds || []);
    articles.value = (await getAllArticlesWithTags()) || [];
  } catch (error) {
    console.error("Error updating article people:", error);
    snackbar.value.message = "Failed to update article people.";
    snackbar.value.show = true;
  } finally {
    updatingArticleId.value = null;
  }
};

const peopleOptions = computed(() => people.value || []);
const sortOptions = [
  { label: "Alphabetical", value: "alphabetical" },
  { label: "Article Count", value: "article-count" },
];
const fallbackOptions = computed(() =>
  (people.value || []).filter((person) => person.id !== selectedPerson.value.id)
);
const personArticleCount = computed(() => personCounts.value || {});
const sortedPeople = computed(() => {
  const items = [...(people.value || [])];
  if (sortMode.value === "article-count") {
    return items.sort((a, b) => {
      const countDiff =
        (personArticleCount.value[b.id] || 0) - (personArticleCount.value[a.id] || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    });
  }

  return items.sort((a, b) =>
    String(a.name || "").localeCompare(String(b.name || ""))
  );
});
const personRoute = (person) => {
  const slug = normalizeTaxonomySlug(person?.slug || person?.name);
  return slug ? localPath(buildTaxonomyPath("/people", slug)) : "";
};
const selectedPersonRoute = computed(() => {
  const slug = normalizeTaxonomySlug(
    selectedPerson.value?.slug || selectedPerson.value?.name
  );
  return slug ? localPath(buildTaxonomyPath("/people", slug)) : "";
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

.article-list {
  max-height: 520px;
  overflow-y: auto;
}

.article-item {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.taxonomy-select {
  min-width: 260px;
}
</style>
