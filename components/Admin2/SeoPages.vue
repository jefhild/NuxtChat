<template>
  <v-card class="pa-4 pa-md-6" elevation="0">
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-5">
      <div>
        <div class="text-overline text-medium-emphasis">SEO Pages</div>
        <h3 class="text-h6 font-weight-bold">Manage landing, guide, and comparison pages</h3>
        <p class="text-body-2 text-medium-emphasis">
          These pages are indexable search-entry pages that route visitors into chat.
        </p>
      </div>

      <div class="d-flex ga-2">
        <v-select
          v-model="selectedType"
          :items="typeOptions"
          item-title="label"
          item-value="value"
          label="Type"
          density="compact"
          hide-details
          style="min-width: 180px;"
        />
        <v-btn color="secondary" variant="tonal" prepend-icon="mdi-code-json" @click="openImportDialog">
          Import JSON
        </v-btn>
        <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreateDialog">
          New SEO Page
        </v-btn>
      </div>
    </div>

    <v-skeleton-loader v-if="loading" type="table-row@6" />

    <v-table v-else density="comfortable">
      <thead>
        <tr>
          <th>Title</th>
          <th>Type</th>
          <th>Locale</th>
          <th>Slug</th>
          <th>Status</th>
          <th class="text-right">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="page in filteredPages" :key="page.id">
          <td>
            <div class="font-weight-medium">{{ page.title }}</div>
            <div class="text-body-2 text-medium-emphasis">
              {{ page.metaDescription || page.subtitle || "No summary yet." }}
            </div>
          </td>
          <td>
            <v-chip size="small" variant="tonal">{{ page.pageType }}</v-chip>
          </td>
          <td>{{ page.locale }}</td>
          <td>{{ buildAdminPath(page) }}</td>
          <td>
            <v-chip
              size="small"
              :color="page.isPublished ? 'success' : 'warning'"
              variant="tonal"
            >
              {{ page.isPublished ? "Published" : "Draft" }}
            </v-chip>
          </td>
          <td class="text-right">
            <v-btn icon="mdi-open-in-new" size="small" variant="text" @click="openPage(page)" />
            <v-btn icon="mdi-pencil" size="small" variant="text" @click="openEditDialog(page)" />
            <v-btn
              icon="mdi-delete"
              size="small"
              variant="text"
              color="error"
              @click="deletePage(page)"
            />
          </td>
        </tr>

        <tr v-if="!filteredPages.length">
          <td colspan="6" class="text-center text-medium-emphasis py-6">
            No SEO pages match this filter yet.
          </td>
        </tr>
      </tbody>
    </v-table>

    <v-dialog v-model="dialog" max-width="1100">
      <v-card>
        <v-card-title>{{ form.id ? "Edit SEO Page" : "Create SEO Page" }}</v-card-title>
        <v-card-text>
          <v-form ref="formRef" @submit.prevent="savePage">
            <v-row>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.pageType"
                  :items="typeOptions"
                  item-title="label"
                  item-value="value"
                  label="Page type"
                  :rules="[required]"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-select
                  v-model="form.locale"
                  :items="localeOptions"
                  label="Locale"
                  :rules="[required]"
                />
              </v-col>
              <v-col cols="12" md="4">
                <v-switch
                  v-model="form.isPublished"
                  color="success"
                  inset
                  label="Published"
                />
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-btn
                  class="mr-2"
                  color="secondary"
                  variant="outlined"
                  prepend-icon="mdi-code-json"
                  @click="openImportDialog"
                >
                  Import JSON
                </v-btn>
                <v-btn
                  color="primary"
                  variant="outlined"
                  prepend-icon="mdi-translate"
                  :disabled="!form.id"
                  :loading="translationLoading"
                  @click="openTranslationDialog"
                >
                  Translate
                </v-btn>
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="8">
                <v-text-field v-model="form.title" label="Title" :rules="[required]" />
              </v-col>
              <v-col cols="12" md="4">
                <v-text-field v-model="form.slug" label="Slug" hint="Auto-generated from title if blank." persistent-hint />
              </v-col>
            </v-row>

            <v-text-field v-model="form.subtitle" label="Subtitle" />
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.metaTitle" label="Meta title" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.metaDescription" label="Meta description" />
              </v-col>
            </v-row>

            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.heroTitle" label="Hero title" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.heroBody" label="Hero body" />
              </v-col>
            </v-row>
            <v-text-field v-model="form.heroImageUrl" label="Hero image URL (optional)" />
            <div class="d-flex flex-wrap align-center ga-3 mb-4">
              <v-file-input
                accept="image/png,image/jpeg,image/webp"
                label="Upload hero image"
                prepend-icon="mdi-image"
                density="comfortable"
                hide-details
                style="max-width: 360px;"
                @change="handleHeroImageChange"
              />
              <v-btn
                color="primary"
                variant="tonal"
                :loading="heroImageUploading"
                :disabled="!heroImageDataUrl"
                @click="uploadHeroImage"
              >
                Upload image
              </v-btn>
            </div>
            <v-row v-if="form.heroImageUrl" class="mb-2">
              <v-col cols="12" md="5">
                <div class="seo-admin-hero-preview">
                  <v-img
                    :src="form.heroImageUrl"
                    aspect-ratio="16/10"
                    cover
                    class="rounded-lg"
                  />
                  <div
                    v-if="form.photoCreditsHtml"
                    class="seo-admin-hero-credit"
                    v-html="form.photoCreditsHtml"
                  />
                </div>
              </v-col>
              <v-col cols="12" md="7">
                <v-text-field
                  v-model="form.photoCreditsUrl"
                  label="Photo Credit URL"
                  :rules="[isValidUrl]"
                />
                <v-textarea
                  v-model="form.photoCreditsHtml"
                  label="Photo Credit HTML"
                  rows="3"
                  auto-grow
                  hint="Example: &lt;a href='...'>Photo: Jane Doe&lt;/a>"
                  persistent-hint
                />
              </v-col>
            </v-row>

            <v-textarea
              v-model="form.body"
              label="Body (Markdown)"
              rows="10"
              auto-grow
            />

            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Highlights</div>
            <div class="d-flex flex-column ga-2 mb-3">
              <div v-for="(highlight, index) in form.highlights" :key="`highlight-${index}`" class="d-flex ga-2">
                <v-text-field v-model="form.highlights[index]" label="Highlight" hide-details />
                <v-btn icon="mdi-delete" variant="text" color="error" @click="removeHighlight(index)" />
              </div>
            </div>
            <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addHighlight">
              Add highlight
            </v-btn>

            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">FAQ</div>
            <v-select
              v-model="form.faqEntryIds"
              :items="availableFaqOptions"
              item-title="label"
              item-value="value"
              label="Linked FAQ entries"
              multiple
              chips
              clearable
              hint="These reuse the existing multilingual FAQ system."
              persistent-hint
            />

            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Related links</div>
            <div class="d-flex flex-column ga-4 mb-3">
              <v-card
                v-for="(link, index) in form.relatedLinks"
                :key="`link-${index}`"
                class="pa-3"
                rounded="lg"
                variant="outlined"
              >
                <v-row>
                  <v-col cols="12" md="5">
                    <v-text-field v-model="link.label" label="Label" />
                  </v-col>
                  <v-col cols="12" md="6">
                    <v-text-field v-model="link.href" label="Href" hint="Internal example: /faq" persistent-hint />
                  </v-col>
                  <v-col cols="12" md="1" class="d-flex align-center justify-end">
                    <v-btn icon="mdi-delete" variant="text" color="error" @click="removeRelatedLink(index)" />
                  </v-col>
                </v-row>
              </v-card>
            </div>
            <v-btn variant="tonal" prepend-icon="mdi-plus" @click="addRelatedLink">
              Add related link
            </v-btn>

            <v-divider class="my-4" />
            <div class="text-subtitle-2 mb-2">Call to action</div>
            <v-row>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.ctaLabel" label="CTA label" />
              </v-col>
              <v-col cols="12" md="6">
                <v-text-field v-model="form.ctaHref" label="CTA href" />
              </v-col>
            </v-row>
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">Cancel</v-btn>
          <v-btn color="primary" :loading="saving" @click="savePage">
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" location="top">
      {{ snackbar.message }}
    </v-snackbar>

    <v-dialog v-model="translationDialog" max-width="480">
      <v-card>
        <v-card-title>Translate SEO Page</v-card-title>
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

    <v-dialog v-model="importDialog" max-width="760">
      <v-card>
        <v-card-title>Import SEO Page JSON</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">
            Paste the full AI JSON output or upload a `.json` file. This fills the editor form, but FAQ suggestions are not auto-linked to the multilingual FAQ system.
          </p>
          <v-file-input
            accept="application/json,.json"
            label="Upload JSON file"
            prepend-icon="mdi-file-code-outline"
            show-size
            class="mb-4"
            @change="handleImportFileChange"
          />
          <v-textarea
            v-model="importJsonText"
            label="SEO page JSON"
            rows="14"
            auto-grow
            placeholder='{"title":"...","slug":"...","body":"..."}'
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="importDialog = false">Cancel</v-btn>
          <v-btn color="primary" @click="applyImportedJson">
            Apply to Form
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup>
const localePath = useLocalePath();

const typeOptions = [
  { label: "Compare", value: "compare" },
  { label: "Guide", value: "guide" },
  { label: "Topic", value: "topic" },
];

const localeOptions = ["en", "fr", "ru", "zh"];

const loading = ref(true);
const saving = ref(false);
const dialog = ref(false);
const translationDialog = ref(false);
const importDialog = ref(false);
const selectedType = ref("compare");
const pages = ref([]);
const availableFaqs = ref([]);
const heroImageDataUrl = ref("");
const importJsonText = ref("");
const heroImageUploading = ref(false);
const translationLoading = ref(false);
const translationJob = ref(null);
let translationPollTimer = null;
const formRef = ref(null);
const snackbar = ref({
  show: false,
  color: "success",
  message: "",
});

const emptyForm = () => ({
  id: null,
  pageType: "compare",
  locale: "en",
  slug: "",
  title: "",
  subtitle: "",
  metaTitle: "",
  metaDescription: "",
  heroTitle: "",
  heroBody: "",
  heroImagePath: "",
  heroImageUrl: "",
  photoCreditsUrl: "",
  photoCreditsHtml: "",
  body: "",
  highlights: [""],
  faqEntryIds: [],
  relatedLinks: [],
  ctaLabel: "Start chatting",
  ctaHref: "/chat",
  isPublished: false,
});

const form = ref(emptyForm());
const translationForm = ref({
  locales: [],
  translateAll: false,
  overwrite: false,
});

const required = (value) => !!String(value || "").trim() || "Required";
const normalizeString = (value) => String(value || "").trim();
const normalizeStringArray = (value) =>
  Array.isArray(value)
    ? value.map((item) => normalizeString(item)).filter(Boolean)
    : [];
const normalizeRelatedLinks = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => ({
          label: normalizeString(item?.label),
          href: normalizeString(item?.href),
        }))
        .filter((item) => item.label && item.href)
    : [];

const filteredPages = computed(() =>
  pages.value.filter((page) => page.pageType === selectedType.value)
);

const translationOptions = computed(() => {
  const currentLocale = String(form.value.locale || "en")
    .trim()
    .toLowerCase();
  return localeOptions
    .filter((option) => option !== currentLocale)
    .map((option) => ({
      label: option.toUpperCase(),
      value: option,
    }));
});

const availableFaqOptions = computed(() =>
  availableFaqs.value.map((faq) => ({
    label: faq.question,
    value: faq.id,
  }))
);

const showMessage = (message, color = "success") => {
  snackbar.value = {
    show: true,
    color,
    message,
  };
};

const loadPages = async () => {
  loading.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages", {
      query: {},
    });
    pages.value = response?.pages || [];
  } catch (error) {
    console.error("Failed to load SEO pages:", error);
    showMessage("Failed to load SEO pages.", "error");
  } finally {
    loading.value = false;
  }
};

const loadFaqs = async () => {
  try {
    const response = await $fetch("/api/faqs", {
      query: { locale: "en" },
    });
    availableFaqs.value = response?.data?.entries || [];
  } catch (error) {
    console.error("Failed to load FAQs:", error);
  }
};

const openCreateDialog = () => {
  form.value = {
    ...emptyForm(),
    pageType: selectedType.value,
  };
  dialog.value = true;
};

const openImportDialog = () => {
  if (!dialog.value) {
    form.value = {
      ...emptyForm(),
      pageType: selectedType.value,
    };
    dialog.value = true;
  }
  importDialog.value = true;
};

const openEditDialog = (page) => {
  form.value = {
    id: page.id,
    pageType: page.pageType,
    locale: page.locale,
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle || "",
    metaTitle: page.metaTitle || "",
    metaDescription: page.metaDescription || "",
    heroTitle: page.heroTitle || "",
    heroBody: page.heroBody || "",
    heroImagePath: page.heroImagePath || "",
    heroImageUrl: page.heroImageUrl || "",
    photoCreditsUrl: page.photoCreditsUrl || "",
    photoCreditsHtml: page.photoCreditsHtml || "",
    body: page.body || "",
    highlights: Array.isArray(page.highlights) && page.highlights.length
      ? [...page.highlights]
      : [""],
    faqEntryIds: Array.isArray(page.faqEntryIds) ? [...page.faqEntryIds] : [],
    relatedLinks: Array.isArray(page.relatedLinks)
      ? page.relatedLinks.map((link) => ({ ...link }))
      : [],
    ctaLabel: page.ctaLabel || "Start chatting",
    ctaHref: page.ctaHref || "/chat",
    isPublished: Boolean(page.isPublished),
  };
  dialog.value = true;
};

const applyImportedPayload = (payload) => {
  const nextPageType = ["compare", "guide", "topic"].includes(
    normalizeString(payload?.pageType || payload?.type).toLowerCase()
  )
    ? normalizeString(payload?.pageType || payload?.type).toLowerCase()
    : form.value.pageType || selectedType.value || "compare";

  form.value = {
    ...form.value,
    pageType: nextPageType,
    locale: normalizeString(payload?.locale || form.value.locale || "en").toLowerCase() || "en",
    slug: normalizeString(payload?.slug || form.value.slug),
    title: normalizeString(payload?.title || form.value.title),
    subtitle: normalizeString(payload?.subtitle || form.value.subtitle),
    metaTitle: normalizeString(payload?.metaTitle || payload?.meta_title || form.value.metaTitle),
    metaDescription: normalizeString(
      payload?.metaDescription || payload?.meta_description || form.value.metaDescription
    ),
    heroTitle: normalizeString(payload?.heroTitle || payload?.hero_title || form.value.heroTitle),
    heroBody: normalizeString(payload?.heroBody || payload?.hero_body || form.value.heroBody),
    heroImageUrl: normalizeString(
      payload?.heroImageUrl || payload?.hero_image_url || form.value.heroImageUrl
    ),
    photoCreditsUrl: normalizeString(
      payload?.photoCreditsUrl || payload?.photo_credits_url || form.value.photoCreditsUrl
    ),
    photoCreditsHtml: normalizeString(
      payload?.photoCreditsHtml || payload?.photo_credits_html || form.value.photoCreditsHtml
    ),
    body: String(payload?.body || form.value.body || "").trim(),
    highlights: normalizeStringArray(payload?.highlights).length
      ? normalizeStringArray(payload?.highlights)
      : form.value.highlights,
    relatedLinks: normalizeRelatedLinks(payload?.relatedLinks).length
      ? normalizeRelatedLinks(payload?.relatedLinks)
      : form.value.relatedLinks,
    ctaLabel: normalizeString(payload?.ctaLabel || payload?.cta_label || form.value.ctaLabel),
    ctaHref: normalizeString(payload?.ctaHref || payload?.cta_href || form.value.ctaHref) || "/chat",
  };

  selectedType.value = nextPageType;
  importDialog.value = false;
  const skippedFaqs = Array.isArray(payload?.faqSuggestions) && payload.faqSuggestions.length > 0;
  showMessage(
    skippedFaqs
      ? "JSON imported. FAQ suggestions were not linked automatically."
      : "JSON imported into the form."
  );
};

const applyImportedJson = () => {
  try {
    const parsed = JSON.parse(String(importJsonText.value || "").trim());
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("Import JSON must be a single object.");
    }
    applyImportedPayload(parsed);
  } catch (error) {
    showMessage(error?.message || "Failed to parse import JSON.", "error");
  }
};

const handleImportFileChange = async (event) => {
  const file = Array.isArray(event) ? event[0] : event?.target?.files?.[0] || event;
  if (!(file instanceof File)) return;
  try {
    importJsonText.value = await file.text();
  } catch (error) {
    showMessage(error?.message || "Failed to read JSON file.", "error");
  }
};

const stopTranslationPolling = () => {
  if (translationPollTimer) {
    clearInterval(translationPollTimer);
    translationPollTimer = null;
  }
};

const applyTranslationJob = async (job) => {
  translationJob.value = job || null;
  if (!job) return;

  if (job.status === "completed") {
    stopTranslationPolling();
    translationLoading.value = false;
    const parts = [];
    if (job.translated?.length) parts.push(`Translated: ${job.translated.join(", ")}`);
    if (job.skipped?.length) parts.push(`Skipped: ${job.skipped.join(", ")}`);
    translationDialog.value = false;
    await loadPages();
    showMessage(parts.length ? parts.join(" · ") : "Translation complete.");
  } else if (job.status === "failed") {
    stopTranslationPolling();
    translationLoading.value = false;
    showMessage(job.error || "Failed to translate SEO page.", "error");
  }
};

const pollTranslationJob = async (jobId) => {
  if (!jobId || !form.value.id) return;
  try {
    const response = await $fetch("/api/admin/seo-pages/translate-status", {
      query: {
        jobId,
        pageId: form.value.id,
      },
    });
    if (response?.success) {
      await applyTranslationJob(response.job || null);
    }
  } catch (error) {
    console.error("[admin] seo translation status", error);
  }
};

const startTranslationPolling = (jobId) => {
  stopTranslationPolling();
  pollTranslationJob(jobId);
  translationPollTimer = setInterval(() => {
    pollTranslationJob(jobId);
  }, 2000);
};

const openTranslationDialog = () => {
  const baseLocale = String(form.value.locale || "en")
    .trim()
    .toLowerCase();
  translationForm.value = {
    locales: [],
    translateAll: false,
    overwrite: false,
  };
  if (translationOptions.value.some((option) => option.value === baseLocale)) {
    translationForm.value.locales = [baseLocale];
  }
  translationDialog.value = true;
};

const runTranslation = async () => {
  if (!form.value.id) return;
  const targets = translationForm.value.translateAll
    ? translationOptions.value.map((option) => option.value)
    : translationForm.value.locales;

  if (!targets.length) {
    showMessage("Select at least one target language.", "error");
    return;
  }

  translationLoading.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/translate", {
      method: "POST",
      body: {
        pageId: form.value.id,
        targetLocales: targets,
        sourceLocale: form.value.locale || "en",
        overwrite: translationForm.value.overwrite,
      },
    });

    if (!response?.success) {
      throw new Error(response?.error || "Translation failed.");
    }

    translationJob.value = response?.job || null;
    showMessage("Translation job started.");
    if (response?.job?.id) {
      startTranslationPolling(response.job.id);
    } else {
      translationLoading.value = false;
    }
  } catch (error) {
    stopTranslationPolling();
    console.error("[admin] translate seo page", error);
    showMessage(
      error?.data?.error || error?.message || "Failed to translate SEO page.",
      "error"
    );
    translationLoading.value = false;
  }
};

const savePage = async () => {
  const result = await formRef.value?.validate?.();
  if (result?.valid === false) return;

  saving.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/save", {
      method: "POST",
      body: {
        id: form.value.id,
        pageType: form.value.pageType,
        locale: form.value.locale,
        slug: form.value.slug,
        title: form.value.title,
        subtitle: form.value.subtitle,
        metaTitle: form.value.metaTitle,
        metaDescription: form.value.metaDescription,
        heroTitle: form.value.heroTitle,
        heroBody: form.value.heroBody,
        heroImagePath: form.value.heroImagePath,
        heroImageUrl: form.value.heroImageUrl,
        photoCreditsUrl: form.value.photoCreditsUrl,
        photoCreditsHtml: form.value.photoCreditsHtml,
        body: form.value.body,
        highlights: form.value.highlights,
        faqEntryIds: form.value.faqEntryIds,
        relatedLinks: form.value.relatedLinks,
        ctaLabel: form.value.ctaLabel,
        ctaHref: form.value.ctaHref,
        isPublished: form.value.isPublished,
      },
    });

    const saved = response?.page;
    if (saved) {
      const next = pages.value.filter((page) => page.id !== saved.id);
      next.unshift(saved);
      pages.value = next;
    }

    dialog.value = false;
    showMessage("SEO page saved.");
  } catch (error) {
    console.error("Failed to save SEO page:", error);
    showMessage(
      error?.data?.error ||
        error?.data?.details?.message ||
        error?.data?.details?.statusMessage ||
        error?.message ||
        "Failed to save SEO page.",
      "error"
    );
  } finally {
    saving.value = false;
  }
};

const deletePage = async (page) => {
  const confirmed = window.confirm(`Delete SEO page "${page.title}"?`);
  if (!confirmed) return;

  try {
    await $fetch("/api/admin/seo-pages/delete", {
      method: "POST",
      body: { id: page.id },
    });
    pages.value = pages.value.filter((item) => item.id !== page.id);
    showMessage("SEO page deleted.");
  } catch (error) {
    console.error("Failed to delete SEO page:", error);
    showMessage("Failed to delete SEO page.", "error");
  }
};

const openPage = (page) => {
  navigateTo(localePath(page.path, page.locale), { external: true });
};

const buildAdminPath = (page) => {
  if (page.pageType === "guide") return `/guides/${page.slug}`;
  if (page.pageType === "topic") return `/topics/${page.slug}`;
  return `/compare/${page.slug}`;
};

const addHighlight = () => form.value.highlights.push("");
const removeHighlight = (index) => form.value.highlights.splice(index, 1);
const addRelatedLink = () =>
  form.value.relatedLinks.push({ label: "", href: "" });
const removeRelatedLink = (index) => form.value.relatedLinks.splice(index, 1);

const handleHeroImageChange = async (event) => {
  const file = Array.isArray(event) ? event[0] : event?.target?.files?.[0] || event;
  if (!(file instanceof File)) {
    heroImageDataUrl.value = "";
    return;
  }
  heroImageDataUrl.value = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const uploadHeroImage = async () => {
  if (!heroImageDataUrl.value) return;
  heroImageUploading.value = true;
  try {
    const response = await $fetch("/api/admin/seo-pages/hero-image", {
      method: "POST",
      body: {
        dataUrl: heroImageDataUrl.value,
        pageType: form.value.pageType,
        slug: form.value.slug || form.value.title,
      },
    });
    form.value.heroImagePath = response?.storagePath || "";
    form.value.heroImageUrl = response?.publicUrl || "";
    heroImageDataUrl.value = "";
    showMessage("Hero image uploaded.");
  } catch (error) {
    console.error("Failed to upload hero image:", error);
    showMessage(
      error?.data?.error?.message || error?.message || "Failed to upload hero image.",
      "error"
    );
  } finally {
    heroImageUploading.value = false;
  }
};

const isValidUrl = (value) => {
  if (!value) return true;
  try {
    new URL(value);
    return true;
  } catch {
    return "Must be a valid URL";
  }
};

onMounted(async () => {
  await Promise.all([loadPages(), loadFaqs()]);
});

onBeforeUnmount(() => {
  stopTranslationPolling();
});
</script>

<style scoped>
.seo-admin-hero-preview {
  position: relative;
  max-width: 320px;
}

.seo-admin-hero-credit {
  position: absolute;
  right: 12px;
  bottom: 12px;
  max-width: calc(100% - 24px);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.seo-admin-hero-credit :deep(a) {
  color: inherit;
}
</style>
