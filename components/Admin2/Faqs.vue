<template>
  <v-card class="pa-4 pa-md-6" elevation="0">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-4">
      <div>
        <div class="text-overline text-medium-emphasis">
          {{ $t("pages.admin.faq.kicker") }}
        </div>
        <h3 class="text-h6 font-weight-bold">
          {{ $t("pages.admin.faq.title") }}
        </h3>
        <p class="text-body-2 text-medium-emphasis">
          {{ $t("pages.admin.faq.subtitle") }}
        </p>
      </div>
      <div class="d-flex ga-2">
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openNewFaq">
          {{ $t("pages.admin.faq.newFaq") }}
        </v-btn>
        <v-btn
          variant="tonal"
          prepend-icon="mdi-folder-plus"
          @click="openNewTopic"
        >
          {{ $t("pages.admin.faq.newTopic") }}
        </v-btn>
      </div>
    </div>

    <v-row>
      <v-col cols="12" md="4">
        <v-card class="admin-faq-card pa-3" elevation="0">
          <div class="text-subtitle-2 font-weight-medium mb-3">
            {{ $t("pages.admin.faq.treeTitle") }}
          </div>
          <v-text-field
            v-model="topicSearch"
            :placeholder="$t('pages.admin.faq.treeSearch')"
            prepend-inner-icon="mdi-magnify"
            variant="solo"
            density="compact"
            hide-details
            clearable
            class="mb-2"
          />
          <v-skeleton-loader
            v-if="loading"
            type="list-item@6"
            class="pa-2"
          />
          <v-treeview
            v-else
            v-model:opened="opened"
            v-model:activated="activated"
            :items="treeItems"
            item-title="title"
            item-value="id"
            item-children="children"
            density="compact"
            color="primary"
            open-on-click
            activatable
            lines="two"
            class="admin-faq-tree"
          >
            <template #prepend="{ item }">
              <v-icon
                v-if="item.icon"
                :icon="item.icon"
                size="18"
                class="mr-2"
              />
            </template>
            <template #append="{ item }">
              <v-btn
                size="x-small"
                variant="text"
                icon="mdi-translate"
                title="Edit translations"
                @click.stop="openTranslationDialog(item)"
              />
            </template>
          </v-treeview>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="admin-faq-card pa-3" elevation="0">
          <div class="d-flex align-center justify-space-between mb-3">
            <div class="text-subtitle-2 font-weight-medium">
              {{ $t("pages.admin.faq.tableTitle") }}
            </div>
            <v-chip size="small" variant="tonal" color="primary">
              {{ tableRows.length }} {{ $t("pages.admin.faq.items") }}
            </v-chip>
          </div>
          <v-skeleton-loader
            v-if="loading"
            type="table-row@4"
            class="pa-2"
          />
          <v-table v-else density="compact">
            <thead>
              <tr>
                <th>{{ $t("pages.admin.faq.columns.question") }}</th>
                <th>{{ $t("pages.admin.faq.columns.topic") }}</th>
                <th>{{ $t("pages.admin.faq.columns.status") }}</th>
                <th>{{ $t("pages.admin.faq.columns.translations") }}</th>
                <th class="text-right">
                  {{ $t("pages.admin.faq.columns.actions") }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in tableRows" :key="row.id">
                <td>{{ row.question }}</td>
                <td>{{ row.topicTitle }}</td>
                <td>
                  <v-chip
                    size="x-small"
                    variant="tonal"
                    :color="row.isActive ? 'success' : 'warning'"
                  >
                    {{ row.isActive ? "Published" : "Draft" }}
                  </v-chip>
                </td>
                <td>
                  <div class="d-flex flex-wrap ga-1">
                    <v-chip
                      v-for="locale in localeOptions"
                      :key="`${row.id}-${locale}`"
                      size="x-small"
                      variant="tonal"
                      :color="row.translations[locale] ? 'success' : 'default'"
                    >
                      {{ locale }}
                    </v-chip>
                  </div>
                </td>
                <td class="text-right">
                  <v-btn
                    icon="mdi-pencil"
                    size="small"
                    variant="text"
                    @click="openEditFaq(row)"
                  />
                  <ClientOnly>
                    <v-tooltip :text="$t('pages.admin.faq.copyLink')" location="top">
                      <template #activator="{ props }">
                        <v-btn
                          v-bind="props"
                          icon="mdi-link-variant"
                          size="small"
                          variant="text"
                          @click="copyFaqLink(row)"
                        />
                      </template>
                    </v-tooltip>
                    <template #fallback>
                      <v-btn
                        icon="mdi-link-variant"
                        size="small"
                        variant="text"
                        @click="copyFaqLink(row)"
                      />
                    </template>
                  </ClientOnly>
                  <v-btn
                    icon="mdi-delete"
                    size="small"
                    variant="text"
                    color="error"
                    @click="removeFaq(row)"
                  />
                </td>
              </tr>
              <tr v-if="!tableRows.length">
                <td colspan="4" class="text-center text-medium-emphasis py-6">
                  No FAQs match this filter yet.
                </td>
              </tr>
            </tbody>
          </v-table>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="newTopicDialog" max-width="520">
      <v-card>
        <v-card-title>New topic</v-card-title>
        <v-card-text>
          <v-form ref="topicFormRef" @submit.prevent="createTopic">
            <v-select
              v-model="newTopic.groupId"
              :items="groupOptions"
              item-title="title"
              item-value="id"
              label="Group"
              density="comfortable"
              :rules="[(v) => !!v || 'Group is required']"
            />
            <v-select
              v-model="newTopic.locale"
              :items="localeOptions"
              label="Locale"
              density="comfortable"
            />
            <v-text-field
              v-model="newTopic.title"
              label="Title"
              :rules="[(v) => !!v || 'Title is required']"
            />
            <v-text-field v-model="newTopic.slug" label="Slug (optional)" />
            <v-switch v-model="newTopic.isActive" label="Published" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="newTopicDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="createTopic">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="newFaqDialog" max-width="640">
      <v-card>
        <v-card-title>New FAQ</v-card-title>
        <v-card-text>
          <v-form ref="faqFormRef" @submit.prevent="createFaq">
            <v-select
              v-model="newFaq.topicId"
              :items="topicOptions"
              item-title="title"
              item-value="id"
              label="Topic"
              density="comfortable"
              :rules="[(v) => !!v || 'Topic is required']"
            />
            <v-select
              v-model="newFaq.locale"
              :items="localeOptions"
              label="Locale"
              density="comfortable"
            />
            <v-text-field
              v-model="newFaq.question"
              label="Question"
              :rules="[(v) => !!v || 'Question is required']"
            />
            <v-textarea
              v-model="newFaq.answer"
              label="Answer"
              :rows="4"
              :rules="[(v) => !!v || 'Answer is required']"
            />
            <v-switch v-model="newFaq.isActive" label="Published" />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="newFaqDialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="createFaq">
            Create
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="editFaqDialog" max-width="640">
      <v-card>
        <v-card-title>Edit FAQ</v-card-title>
        <v-card-text>
          <v-form ref="editFaqFormRef" @submit.prevent="saveFaqEdits">
            <v-select
              v-model="editFaq.topicId"
              :items="topicOptions"
              item-title="title"
              item-value="id"
              label="Topic"
              density="comfortable"
              :rules="[(v) => !!v || 'Topic is required']"
            />
            <v-select
              v-model="editFaq.locale"
              :items="localeOptions"
              label="Locale"
              density="comfortable"
            />
            <v-text-field
              v-model="editFaq.question"
              label="Question"
              :rules="[(v) => !!v || 'Question is required']"
            />
            <v-textarea
              v-model="editFaq.answer"
              label="Answer"
              :rows="4"
              :rules="[(v) => !!v || 'Answer is required']"
            />
            <v-switch v-model="editFaq.isActive" label="Published" />
            <div class="text-caption text-medium-emphasis mt-2">
              {{ $t("pages.admin.faq.translationStatus") }}
            </div>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip
                v-for="locale in localeOptions"
                :key="`edit-${editFaq.id}-${locale}`"
                size="x-small"
                variant="tonal"
                :color="editFaq.translations?.[locale] ? 'success' : 'default'"
              >
                {{ locale }}
              </v-chip>
            </div>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="editFaqDialog = false">Cancel</v-btn>
          <v-btn
            variant="tonal"
            :loading="saving"
            @click="translateMissing('entry', editFaq.id)"
          >
            {{ $t("pages.admin.faq.translateMissing") }}
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="saveFaqEdits">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="translationDialog" max-width="520">
      <v-card>
        <v-card-title>{{ translationDialogTitle }}</v-card-title>
        <v-card-text>
          <v-form ref="translationFormRef" @submit.prevent="saveTranslation">
            <v-select
              v-model="translationForm.locale"
              :items="localeOptions"
              label="Locale"
              density="comfortable"
            />
            <v-text-field
              v-model="translationForm.title"
              label="Title"
              :rules="[(v) => !!v || 'Title is required']"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="translationDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="saving" @click="saveTranslation">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :timeout="3500" color="red" location="top">
      {{ snackbar.message }}
    </v-snackbar>
  </v-card>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const {
  getFaqGroups,
  getFaqGroupTranslations,
  getFaqTopics,
  getFaqTopicTranslations,
  getFaqEntries,
  getFaqTranslations,
  insertFaqTopic,
  insertFaqTopicTranslation,
  updateFaqTopicTranslation,
  updateFaqGroupTranslation,
  insertFaqEntry,
  insertFaqTranslation,
  updateFaqEntry,
  updateFaqTranslation,
  deleteFaqEntry,
} = useDb();

const { locale, localeProperties } = useI18n();

const topicSearch = ref("");
const opened = ref([]);
const activated = ref([]);
const loading = ref(false);
const saving = ref(false);

const groups = ref([]);
const groupTranslations = ref([]);
const topics = ref([]);
const topicTranslations = ref([]);
const entries = ref([]);
const entryTranslations = ref([]);

const newTopicDialog = ref(false);
const newFaqDialog = ref(false);
const editFaqDialog = ref(false);
const translationDialog = ref(false);
const topicFormRef = ref(null);
const faqFormRef = ref(null);
const editFaqFormRef = ref(null);
const translationFormRef = ref(null);

const newTopic = ref({
  groupId: null,
  title: "",
  slug: "",
  locale: "en-US",
  isActive: true,
});

const newFaq = ref({
  topicId: null,
  question: "",
  answer: "",
  locale: "en-US",
  isActive: true,
});

const editFaq = ref({
  id: null,
  topicId: null,
  question: "",
  answer: "",
  locale: "en-US",
  isActive: true,
});

const translationForm = ref({
  id: null,
  type: "topic",
  locale: "en-US",
  title: "",
});

const snackbar = ref({
  show: false,
  message: "",
});

const localeMap = {
  en: "en-US",
  fr: "fr-FR",
  ru: "ru-RU",
  zh: "zh-CN",
};

const localeOptions = computed(() => ["en-US", "fr-FR", "ru-RU", "zh-CN"]);

const activeLocale = computed(() => {
  return (
    localeProperties.value?.iso ||
    localeMap[locale.value] ||
    locale.value ||
    "en-US"
  );
});

const localeList = computed(() => {
  const fallback = "en-US";
  return activeLocale.value === fallback
    ? [fallback]
    : [activeLocale.value, fallback];
});

const groupTranslationMap = computed(() => {
  const map = new Map();
  groupTranslations.value.forEach((translation) => {
    if (!map.has(translation.group_id)) {
      map.set(translation.group_id, {});
    }
    map.get(translation.group_id)[translation.locale] = translation.title;
  });
  return map;
});

const topicTranslationMap = computed(() => {
  const map = new Map();
  topicTranslations.value.forEach((translation) => {
    if (!map.has(translation.topic_id)) {
      map.set(translation.topic_id, {});
    }
    map.get(translation.topic_id)[translation.locale] = translation.title;
  });
  return map;
});

const entryTranslationMap = computed(() => {
  const map = new Map();
  entryTranslations.value.forEach((translation) => {
    if (!map.has(translation.entry_id)) {
      map.set(translation.entry_id, {});
    }
    map.get(translation.entry_id)[translation.locale] = {
      question: translation.question,
      answer: translation.answer,
    };
  });
  return map;
});

const pickTranslation = (translationMap, id, field) => {
  const translations = translationMap.get(id) || {};
  return (
    translations[activeLocale.value]?.[field] ||
    translations["en-US"]?.[field] ||
    ""
  );
};

const pickTitle = (translationMap, id, fallback) => {
  const translations = translationMap.get(id) || {};
  return translations[activeLocale.value] || translations["en-US"] || fallback;
};

const groupsWithTitles = computed(() =>
  groups.value.map((group) => ({
    ...group,
    title: pickTitle(groupTranslationMap.value, group.id, group.slug),
  }))
);

const topicsWithTitles = computed(() =>
  topics.value.map((topic) => ({
    ...topic,
    title: pickTitle(topicTranslationMap.value, topic.id, topic.slug),
  }))
);

const groupIconMap = {
  "getting-started": "mdi-rocket-launch",
  "chat-tools": "mdi-message-text-outline",
  "safety-privacy": "mdi-shield-check",
  community: "mdi-account-group-outline",
};

const treeItems = computed(() => {
  const term = topicSearch.value.trim().toLowerCase();
  const items = [];

  groupsWithTitles.value.forEach((group) => {
    const children = topicsWithTitles.value
      .filter((topic) => topic.group_id === group.id)
      .filter((topic) =>
        term ? topic.title.toLowerCase().includes(term) : true
      )
      .map((topic) => ({
        id: topic.id,
        title: topic.title,
        type: "topic",
      }));

    const matchesGroup = term
      ? group.title.toLowerCase().includes(term)
      : true;

    if (!children.length && !matchesGroup) return;

    items.push({
      id: group.id,
      title: group.title,
      icon: groupIconMap[group.slug] || "mdi-folder-outline",
      type: "group",
      children,
    });
  });

  return items;
});

const groupOptions = computed(() => groupsWithTitles.value);

const topicOptions = computed(() =>
  topicsWithTitles.value
    .map((topic) => ({
      ...topic,
      title: topic.title,
    }))
    .sort((a, b) => a.title.localeCompare(b.title))
);

const tableRows = computed(() => {
  const activeFilter = activated.value[0];
  const filtered = entries.value.filter((entry) => {
    if (!activeFilter) return true;
    const topic = topicsWithTitles.value.find(
      (item) => item.id === entry.topic_id
    );
    if (!topic) return false;
    return topic.id === activeFilter || topic.group_id === activeFilter;
  });

  return filtered.map((entry) => {
    const topic = topicsWithTitles.value.find(
      (item) => item.id === entry.topic_id
    );
    const translationLocales =
      entryTranslationMap.value.get(entry.id) || {};
    return {
      id: entry.id,
      topicId: entry.topic_id,
      question: pickTranslation(entryTranslationMap.value, entry.id, "question"),
      answer: pickTranslation(entryTranslationMap.value, entry.id, "answer"),
      topicTitle: topic?.title || "Unknown",
      slug: entry.slug || "",
      isActive: entry.is_active,
      sortOrder: entry.sort_order ?? 0,
      translations: localeOptions.value.reduce((acc, locale) => {
        acc[locale] = Boolean(translationLocales[locale]);
        return acc;
      }, {}),
    };
  });
});

const slugify = (value = "") =>
  value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/^-+|-+$/g, "");

const refreshData = async () => {
  loading.value = true;
  try {
    const [groupsData, topicsData, entriesData] = await Promise.all([
      getFaqGroups(),
      getFaqTopics(),
      getFaqEntries(),
    ]);

    const locales = localeOptions.value;
    const [
      groupTranslationsData,
      topicTranslationsData,
      entryTranslationsData,
    ] = await Promise.all([
      getFaqGroupTranslations(locales),
      getFaqTopicTranslations(locales),
      getFaqTranslations(locales),
    ]);

    groups.value = groupsData || [];
    topics.value = topicsData || [];
    entries.value = entriesData || [];
    groupTranslations.value = groupTranslationsData || [];
    topicTranslations.value = topicTranslationsData || [];
    entryTranslations.value = entryTranslationsData || [];

    if (!opened.value.length && groups.value.length) {
      opened.value = [groups.value[0].id];
    }
  } finally {
    loading.value = false;
  }
};

const openNewTopic = () => {
  newTopic.value = {
    groupId: groups.value[0]?.id || null,
    title: "",
    slug: "",
    locale: "en-US",
    isActive: true,
  };
  newTopicDialog.value = true;
};

const openNewFaq = () => {
  newFaq.value = {
    topicId: topics.value[0]?.id || null,
    question: "",
    answer: "",
    locale: "en-US",
    isActive: true,
  };
  newFaqDialog.value = true;
};

const createTopic = async () => {
  const { valid } = await topicFormRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    const slug = newTopic.value.slug || slugify(newTopic.value.title);
    const { data, error } = await insertFaqTopic({
      group_id: newTopic.value.groupId,
      slug,
      sort_order: 0,
      is_active: newTopic.value.isActive,
    });

    if (error) throw error;

    const translationError = await insertFaqTopicTranslation({
      topic_id: data.id,
      locale: newTopic.value.locale || "en-US",
      title: newTopic.value.title,
    });

    if (translationError?.error) throw translationError.error;

    newTopicDialog.value = false;
    await refreshData();
  } catch (err) {
    snackbar.value.message = err?.message || "Failed to create topic.";
    snackbar.value.show = true;
  } finally {
    saving.value = false;
  }
};

const createFaq = async () => {
  const { valid } = await faqFormRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    const topicEntries = entries.value.filter(
      (entry) => entry.topic_id === newFaq.value.topicId
    );
    const nextSort =
      Math.max(0, ...topicEntries.map((entry) => entry.sort_order || 0)) + 1;

    const { data, error } = await insertFaqEntry({
      topic_id: newFaq.value.topicId,
      sort_order: nextSort,
      is_active: newFaq.value.isActive,
    });

    if (error) throw error;

    const translationError = await insertFaqTranslation({
      entry_id: data.id,
      locale: newFaq.value.locale || "en-US",
      question: newFaq.value.question,
      answer: newFaq.value.answer,
    });

    if (translationError?.error) throw translationError.error;

    newFaqDialog.value = false;
    await refreshData();
  } catch (err) {
    snackbar.value.message = err?.message || "Failed to create FAQ.";
    snackbar.value.show = true;
  } finally {
    saving.value = false;
  }
};

const openEditFaq = (row) => {
  editFaq.value = {
    id: row.id,
    topicId: row.topicId,
    question: row.question,
    answer: row.answer,
    locale: "en-US",
    isActive: row.isActive,
    translations: row.translations,
  };
  editFaqDialog.value = true;
};

const saveFaqEdits = async () => {
  const { valid } = await editFaqFormRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    const entryError = await updateFaqEntry(editFaq.value.id, {
      topic_id: editFaq.value.topicId,
      is_active: editFaq.value.isActive,
    });
    if (entryError) throw entryError;

    const translationError = await updateFaqTranslation(
      editFaq.value.id,
      editFaq.value.locale || "en-US",
      {
        question: editFaq.value.question,
        answer: editFaq.value.answer,
      }
    );
    if (translationError) throw translationError;

    editFaqDialog.value = false;
    await refreshData();
  } catch (err) {
    snackbar.value.message = err?.message || "Failed to update FAQ.";
    snackbar.value.show = true;
  } finally {
    saving.value = false;
  }
};

const removeFaq = async (row) => {
  if (!confirm("Delete this FAQ?")) return;
  saving.value = true;
  try {
    const error = await deleteFaqEntry(row.id);
    if (error) throw error;
    await refreshData();
  } catch (err) {
    snackbar.value.message = err?.message || "Failed to delete FAQ.";
    snackbar.value.show = true;
  } finally {
    saving.value = false;
  }
};

const copyFaqLink = async (row) => {
  const slug = row.slug;
  if (!slug) {
    snackbar.value.message = "Add a slug to generate a link.";
    snackbar.value.show = true;
    return;
  }
  if (typeof window === "undefined") return;
  const link = `${window.location.origin}/faq#${slug}`;
  try {
    await navigator.clipboard.writeText(link);
    snackbar.value.message = "FAQ link copied.";
    snackbar.value.show = true;
  } catch {
    snackbar.value.message = link;
    snackbar.value.show = true;
  }
};

const openTranslationDialog = (item) => {
  const isGroup = item.type === "group";
  const translationMap = isGroup
    ? groupTranslationMap.value
    : topicTranslationMap.value;
  translationForm.value = {
    id: item.id,
    type: isGroup ? "group" : "topic",
    locale: "en-US",
    title: pickTitle(translationMap, item.id, item.title),
  };
  translationDialog.value = true;
};

const translationDialogTitle = computed(() =>
  translationForm.value.type === "group"
    ? "Edit group translation"
    : "Edit topic translation"
);

const saveTranslation = async () => {
  const { valid } = await translationFormRef.value.validate();
  if (!valid) return;
  saving.value = true;
  try {
    if (translationForm.value.type === "group") {
      const error = await updateFaqGroupTranslation(
        translationForm.value.id,
        translationForm.value.locale,
        { title: translationForm.value.title }
      );
      if (error) throw error;
    } else {
      const error = await updateFaqTopicTranslation(
        translationForm.value.id,
        translationForm.value.locale,
        { title: translationForm.value.title }
      );
      if (error) throw error;
    }
    translationDialog.value = false;
    await refreshData();
  } catch (err) {
    snackbar.value.message = err?.message || "Failed to update translation.";
    snackbar.value.show = true;
  } finally {
    saving.value = false;
  }
};

const translateMissing = async (type, id) => {
  if (!id) return;
  saving.value = true;
  try {
    const payload = {
      type,
      id,
      sourceLocale: "en-US",
      targetLocales: localeOptions.value.filter((locale) => locale !== "en-US"),
    };
    const response = await $fetch("/api/admin/faq/translate", {
      method: "POST",
      body: payload,
    });
    if (!response?.success) {
      throw new Error(response?.error || "Translation failed.");
    }
    await refreshData();
  } catch (err) {
    snackbar.value.message = err?.message || "Failed to translate.";
    snackbar.value.show = true;
  } finally {
    saving.value = false;
  }
};

onMounted(async () => {
  await refreshData();
});

watch(localeList, async () => {
  await refreshData();
});

watch(
  () => editFaq.value.locale,
  (nextLocale) => {
    if (!editFaq.value.id || !nextLocale) return;
    const translation =
      entryTranslationMap.value.get(editFaq.value.id)?.[nextLocale];
    if (translation) {
      editFaq.value.question = translation.question || "";
      editFaq.value.answer = translation.answer || "";
    } else if (nextLocale === "en-US") {
      editFaq.value.question =
        pickTranslation(entryTranslationMap.value, editFaq.value.id, "question");
      editFaq.value.answer =
        pickTranslation(entryTranslationMap.value, editFaq.value.id, "answer");
    } else {
      editFaq.value.question = "";
      editFaq.value.answer = "";
    }
  }
);

watch(
  () => translationForm.value.locale,
  (nextLocale) => {
    if (!translationForm.value.id || !nextLocale) return;
    const translationMap =
      translationForm.value.type === "group"
        ? groupTranslationMap.value
        : topicTranslationMap.value;
    translationForm.value.title = pickTitle(
      translationMap,
      translationForm.value.id,
      ""
    );
  }
);
</script>

<style scoped>
.admin-faq-card {
  border-radius: 16px;
  border: 1px solid rgba(99, 109, 129, 0.2);
}

.admin-faq-tree :deep(.v-treeview-node__root) {
  border-radius: 12px;
}
</style>
