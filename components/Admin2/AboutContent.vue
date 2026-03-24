<template>
  <v-card class="pa-4 pa-md-6" elevation="0">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-4">
      <div>
        <div class="text-overline text-medium-emphasis">About Page</div>
        <h3 class="text-h6 font-weight-bold">Static sections, editable copy</h3>
        <p class="text-body-2 text-medium-emphasis">
          The layout stays hardcoded. Titles and body content are editable per locale.
        </p>
      </div>
      <div class="d-flex align-center ga-3">
        <v-select
          v-model="activeLocale"
          :items="localeOptions"
          label="Locale"
          density="comfortable"
          hide-details
          style="min-width: 120px"
        />
        <v-btn
          variant="tonal"
          color="secondary"
          :loading="translationLoading"
          @click="openTranslationDialog"
        >
          Translate
        </v-btn>
        <v-btn color="primary" :loading="saving" @click="saveContent">
          Save
        </v-btn>
      </div>
    </div>

    <v-alert
      v-if="!storageReady"
      type="warning"
      variant="tonal"
      class="mb-4"
    >
      The `about_page_translations` table does not exist yet. Run
      `sql/about_page_translations.sql` before saving.
    </v-alert>

    <v-alert type="info" variant="tonal" class="mb-4">
      Leaving a section blank removes its override for this locale and the page falls back to the built-in copy.
    </v-alert>

    <v-row>
      <v-col
        v-for="section in formSections"
        :key="section.key"
        cols="12"
      >
        <v-card class="pa-4" elevation="0" rounded="lg">
          <div class="d-flex align-center justify-space-between mb-3">
            <div>
              <div class="text-overline text-medium-emphasis">{{ section.label }}</div>
              <div class="text-caption text-medium-emphasis">{{ section.key }}</div>
            </div>
            <v-chip
              size="small"
              variant="tonal"
              :color="section.hasOverride ? 'success' : 'default'"
            >
              {{ section.hasOverride ? "Override" : "Fallback" }}
            </v-chip>
          </div>

          <v-text-field
            v-model="section.title"
            label="Section title"
            density="comfortable"
            class="mb-3"
          />
          <v-textarea
            v-model="section.body"
            label="Section body"
            rows="6"
            auto-grow
            hint="Markdown is supported."
            persistent-hint
          />
        </v-card>
      </v-col>
    </v-row>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" timeout="3200">
      {{ snackbar.message }}
    </v-snackbar>

    <v-dialog v-model="translationDialog" max-width="520">
      <v-card>
        <v-card-title>Translate About content</v-card-title>
        <v-card-text>
          <v-select
            v-model="translationForm.locales"
            :items="translationOptions"
            item-title="label"
            item-value="value"
            label="Target locales"
            chips
            multiple
          />
          <v-switch
            v-model="translationForm.overwrite"
            label="Overwrite existing translations"
            color="primary"
            inset
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="translationDialog = false">
            Cancel
          </v-btn>
          <v-btn color="primary" :loading="translationLoading" @click="translateContent">
            Translate
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ABOUT_SECTION_DEFINITIONS } from "@/utils/aboutPageSections";

const localeOptions = ["en", "fr", "ru", "zh"];
const activeLocale = ref("en");
const loading = ref(false);
const saving = ref(false);
const translationLoading = ref(false);
const translationDialog = ref(false);
const storageReady = ref(true);
const formSections = ref(
  ABOUT_SECTION_DEFINITIONS.map((section) => ({
    key: section.key,
    label: section.label,
    title: "",
    body: "",
    hasOverride: false,
  }))
);

const snackbar = ref({
  show: false,
  color: "success",
  message: "",
});

const translationForm = ref({
  locales: [] as string[],
  overwrite: false,
});

const translationOptions = computed(() =>
  localeOptions
    .filter((locale) => locale !== activeLocale.value)
    .map((locale) => ({
      label: locale.toUpperCase(),
      value: locale,
    }))
);

const showMessage = (message: string, color = "success") => {
  snackbar.value = {
    show: true,
    color,
    message,
  };
};

const applySections = (sections: any[] = []) => {
  const sectionMap = new Map(sections.map((section) => [section.key, section]));
  formSections.value = ABOUT_SECTION_DEFINITIONS.map((definition) => {
    const current = sectionMap.get(definition.key);
    return {
      key: definition.key,
      label: definition.label,
      title: String(current?.title || ""),
      body: String(current?.body || ""),
      hasOverride: Boolean(current?.hasOverride),
    };
  });
};

const loadContent = async () => {
  loading.value = true;
  try {
    const response = await $fetch("/api/admin/about-content", {
      query: { locale: activeLocale.value },
    });
    storageReady.value = Boolean(response?.storageReady);
    applySections(response?.sections || []);
  } catch (error) {
    console.error("Failed to load About content:", error);
    storageReady.value = false;
    applySections([]);
    showMessage("Failed to load About content.", "error");
  } finally {
    loading.value = false;
  }
};

const saveContent = async () => {
  saving.value = true;
  try {
    const response = await $fetch("/api/admin/about-content/save", {
      method: "POST",
      body: {
        locale: activeLocale.value,
        sections: formSections.value.map((section) => ({
          key: section.key,
          title: section.title,
          body: section.body,
        })),
      },
    });
    storageReady.value = Boolean(response?.storageReady);
    applySections(response?.sections || []);
    showMessage("About content saved.");
  } catch (error: any) {
    console.error("Failed to save About content:", error);
    showMessage(error?.data?.error || "Failed to save About content.", "error");
  } finally {
    saving.value = false;
  }
};

const openTranslationDialog = () => {
  translationForm.value = {
    locales: translationOptions.value.map((option) => option.value),
    overwrite: false,
  };
  translationDialog.value = true;
};

const translateContent = async () => {
  if (!translationForm.value.locales.length) {
    showMessage("Choose at least one target locale.", "error");
    return;
  }

  translationLoading.value = true;
  try {
    const response = await $fetch("/api/admin/about-content/translate", {
      method: "POST",
      body: {
        sourceLocale: activeLocale.value,
        targetLocales: translationForm.value.locales,
        overwrite: translationForm.value.overwrite,
        sections: formSections.value.map((section) => ({
          key: section.key,
          title: section.title,
          body: section.body,
        })),
      },
    });

    translationDialog.value = false;
    showMessage(
      [
        response?.translated?.length
          ? `Translated: ${response.translated.join(", ")}`
          : "",
        response?.skipped?.length ? `Skipped: ${response.skipped.join(", ")}` : "",
      ]
        .filter(Boolean)
        .join(" | ") || "Translation complete."
    );
  } catch (error: any) {
    console.error("Failed to translate About content:", error);
    showMessage(error?.data?.error || "Failed to translate About content.", "error");
  } finally {
    translationLoading.value = false;
  }
};

watch(
  () => activeLocale.value,
  () => {
    loadContent();
  },
  { immediate: true }
);
</script>
