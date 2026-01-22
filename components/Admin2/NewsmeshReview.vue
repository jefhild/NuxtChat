<template>
  <div class="newsmesh-admin d-flex flex-column ga-6">
    <v-card class="pa-4" elevation="3">
      <v-card-title class="d-flex align-center ga-3">
        <div class="text-h6">Newsmesh Streams</div>
        <v-chip size="small" color="primary" variant="tonal">
          {{ meta.total }} records
        </v-chip>
        <v-spacer />
        <v-btn
          color="primary"
          prepend-icon="mdi-flash"
          :loading="ingesting"
          :disabled="loadingArticles || ingesting"
          @click="runIngest"
        >
          Run ingest
        </v-btn>
        <v-btn
          icon="mdi-refresh"
          variant="text"
          :disabled="loadingArticles"
          @click="loadArticles"
        />
      </v-card-title>
      <v-card-subtitle>
        Review the aggregated feeds, filter by stream, and queue articles for
        perspective rewrites.
      </v-card-subtitle>

      <v-card-text>
        <v-alert
          v-if="ingestSuccess"
          type="success"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="ingestSuccess = ''"
        >
          {{ ingestSuccess }}
        </v-alert>
        <v-alert
          v-if="ingestError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="ingestError = ''"
        >
          {{ ingestError }}
        </v-alert>

        <v-row class="mb-4" dense>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="filters.search"
              label="Search title, summary or source"
              prepend-inner-icon="mdi-magnify"
              clearable
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.stream"
              :items="streamOptions"
              label="Stream"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="filters.status"
              :items="statusOptions"
              label="Status"
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-alert
          v-if="articlesError"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mb-4"
        >
          {{ articlesError }}
        </v-alert>
        <v-alert
          v-if="deleteError"
          type="error"
          variant="tonal"
          border="start"
          border-color="red"
          class="mb-4"
          closable
          @click:close="deleteError = ''"
        >
          {{ deleteError }}
        </v-alert>

        <v-data-table
          v-model="selectedIds"
          :headers="tableHeaders"
          :items="articles"
          :loading="loadingArticles"
          :items-per-page="-1"
          item-value="id"
          show-select
          class="newsmesh-table"
          hover
          fixed-header
          height="640"
          hide-default-footer
        >
          <template #item.title="{ item }">
            <div class="d-flex flex-column">
              <div class="font-weight-medium text-body-1 mb-1">
                {{ item.title || "Untitled article" }}
              </div>
              <div class="text-body-2 text-medium-emphasis">
                {{ item.description || "No summary available" }}
              </div>
              <div class="d-flex flex-wrap ga-1 mt-2">
                <v-chip
                  v-for="topic in toDisplayList(item.topics)"
                  :key="topic"
                  size="x-small"
                  color="indigo"
                  variant="tonal"
                >
                  {{ topic }}
                </v-chip>
              </div>
            </div>
          </template>

          <template #item.stream="{ item }">
            <v-chip
              size="small"
              :color="item.stream === 'trending' ? 'deep-purple' : 'primary'"
              variant="tonal"
            >
              {{ item.stream }}
            </v-chip>
          </template>

          <template #item.source="{ item }">
            <div class="d-flex flex-column">
              <span class="font-weight-medium">
                {{ item.source || "Unknown" }}
              </span>
              <span class="text-caption text-medium-emphasis">
                {{ item.category || "Uncategorized" }}
              </span>
              <div class="d-flex flex-wrap ga-1 mt-1">
                <v-chip
                  v-for="person in toDisplayList(item.people)"
                  :key="person"
                  size="x-small"
                  color="teal"
                  variant="tonal"
                >
                  {{ person }}
                </v-chip>
              </div>
            </div>
          </template>

          <template #item.published_date="{ item }">
            <div class="d-flex flex-column text-caption">
              <span>
                {{ formatDate(item.published_date) }}
              </span>
              <span class="text-medium-emphasis">
                Seen {{ formatDate(item.last_seen_at) }}
              </span>
              <a
                v-if="item.link"
                :href="item.link"
                class="text-primary mt-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open link
              </a>
            </div>
          </template>
        </v-data-table>

        <v-alert
          v-if="!loadingArticles && !articles.length"
          type="info"
          variant="tonal"
          class="mt-4"
        >
          No articles match your filters.
        </v-alert>
      </v-card-text>
    </v-card>

    <v-card class="pa-4" elevation="3">
      <v-card-title class="d-flex align-center ga-3">
        <div class="text-h6">Rewrite With AI</div>
        <v-chip variant="tonal" size="small">
          {{ selectedIds.length }} selected
        </v-chip>
        <v-spacer />
        <v-btn
          icon="mdi-robot-happy-outline"
          variant="text"
          @click="loadBots"
          :disabled="loadingBots"
        />
      </v-card-title>
      <v-card-text>
        <v-row dense>
          <v-col cols="12" md="4">
            <v-select
              v-model="selectedPersona"
              :items="botOptions"
              :loading="loadingBots"
              label="Persona / bias"
              item-title="label"
              item-value="value"
              hide-details="auto"
              clearable
            />
          </v-col>
          <v-col cols="12" md="8">
            <v-textarea
              v-model="instructions"
              label="Extra guidance (optional)"
              rows="3"
              auto-grow
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <v-alert
          v-if="rewriteError"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="rewriteError = ''"
        >
          {{ rewriteError }}
        </v-alert>

        <div class="d-flex align-center ga-3 mt-3 flex-wrap">
          <v-btn
            color="primary"
            :disabled="!canRewrite"
            :loading="rewriting"
            @click="openPromptDialog"
          >
            Review Prompt & Rewrite
          </v-btn>
          <v-btn
            color="error"
            variant="outlined"
            :disabled="!hasSelection || deleting || loadingArticles"
            :loading="deleting"
            @click="deleteSelected"
          >
            Delete Selected
          </v-btn>
          <span class="text-caption text-medium-emphasis">
            Rewrites run in small batches (max {{ maxBatch }}).
          </span>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="promptDialog" max-width="1000">
      <v-card class="pa-2">
        <v-card-title class="d-flex align-center ga-3">
          <div class="text-h6">Review Prompt</div>
          <v-spacer />
          <v-chip v-if="promptDrafts.length" size="small" variant="tonal">
            {{ promptDrafts.length }} prompt(s)
          </v-chip>
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="promptError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="promptError = ''"
          >
            {{ promptError }}
          </v-alert>

          <v-progress-linear
            v-if="promptLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <div v-if="!promptLoading && !promptDrafts.length">
            No prompts available yet.
          </div>

          <v-expansion-panels
            v-else
            multiple
            class="prompt-panels"
          >
            <v-expansion-panel
              v-for="draft in promptDrafts"
              :key="draft.articleId"
            >
              <v-expansion-panel-title>
                <div class="d-flex flex-column text-left">
                  <div class="font-weight-medium">
                    {{ draft.original.title || "Untitled article" }}
                  </div>
                  <div class="text-caption text-medium-emphasis">
                    {{ draft.original.source || "Source unknown" }} ·
                    {{ draft.stream }}
                  </div>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <v-alert
                  v-if="!draft.sourceText"
                  type="warning"
                  variant="tonal"
                  class="mb-3"
                >
                  Source text could not be extracted for this URL. The prompt may
                  rely mostly on Newsmesh metadata.
                </v-alert>
                <v-alert
                  v-else-if="draft.sourceText.length < SOURCE_TEXT_MIN"
                  type="warning"
                  variant="tonal"
                  class="mb-3"
                >
                  Source text is short ({{ draft.sourceText.length }} chars). The
                  rewrite may lack concrete details.
                </v-alert>
                <v-textarea
                  v-model="draft.prompt"
                  label="Rewrite prompt"
                  rows="12"
                  auto-grow
                  hide-details="auto"
                />
                <div class="text-caption text-medium-emphasis mt-2">
                  Edit the prompt before sending it to the model.
                </div>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card-text>
        <v-card-actions class="d-flex align-center">
          <v-spacer />
          <v-btn variant="text" @click="promptDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="promptLoading || !promptDrafts.length || !canRewrite"
            :loading="rewriting"
            @click="confirmRewrite"
          >
            Send to AI
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-card
      v-if="rewriteResults.length"
      class="pa-4"
      elevation="3"
      data-testid="newsmesh-rewrites"
    >
      <v-card-title class="text-h6">
        Draft Rewrites (latest {{ rewriteResults.length }})
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="draftError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="draftError = ''"
        >
          {{ draftError }}
        </v-alert>
        <v-expansion-panels multiple>
          <v-expansion-panel
            v-for="result in rewriteResults"
            :key="result.articleId"
          >
            <v-expansion-panel-title>
              <div class="d-flex flex-column text-left">
                <div class="font-weight-medium">
                  {{ result.rewrite.headline }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ result.original.source || "Source unknown" }} ·
                  {{ result.stream }}
                </div>
              </div>
            </v-expansion-panel-title>
            <v-expansion-panel-text>
              <div class="mb-4">
                <div class="text-subtitle-2">Summary</div>
                <p class="text-body-2">
                  {{ result.rewrite.summary }}
                </p>
              </div>

              <div class="mb-4">
                <div class="text-subtitle-2">Persona Output</div>
                <div
                  class="markdown-body"
                  v-html="renderMarkdown(result.rewrite.body)"
                ></div>
              </div>

              <div class="mb-4" v-if="result.rewrite.references.length">
                <div class="text-subtitle-2">References</div>
                <ul class="pl-4">
                  <li
                    v-for="ref in result.rewrite.references"
                    :key="ref.label + (ref.url || '')"
                  >
                    <template v-if="ref.url">
                      <a
                        :href="ref.url"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ ref.label }}
                      </a>
                    </template>
                    <template v-else>
                      {{ ref.label }}
                    </template>
                  </li>
                </ul>
              </div>

              <div class="mb-4" v-if="result.rewrite.social">
                <div class="text-subtitle-2">Social Captions</div>
                <div class="mt-2">
                  <div class="text-caption text-medium-emphasis mb-1">
                    Facebook
                  </div>
                  <pre class="text-body-2 whitespace-pre-wrap">
{{ result.rewrite.social?.facebook?.caption || "—" }}
                  </pre>
                </div>
                <div class="mt-3">
                  <div class="text-caption text-medium-emphasis mb-1">
                    Instagram
                  </div>
                  <pre class="text-body-2 whitespace-pre-wrap">
{{ result.rewrite.social?.instagram?.caption || "—" }}
                  </pre>
                </div>
              </div>

              <v-divider class="my-4" />

              <div class="d-flex flex-wrap ga-2 mb-3">
                <v-chip
                  v-if="result.original.published_date"
                  size="small"
                  variant="tonal"
                >
                  Published:
                  {{ formatDate(result.original.published_date) }}
                </v-chip>
                <v-chip
                  v-if="result.original.source"
                  size="small"
                  variant="outlined"
                  :href="result.original.link || undefined"
                  :target="result.original.link ? '_blank' : undefined"
                  :rel="
                    result.original.link
                      ? 'noopener noreferrer'
                      : undefined
                  "
                >
                  Source: {{ result.original.source }}
                </v-chip>
              </div>

              <div class="text-caption text-medium-emphasis">
                <strong>Original:</strong> {{ result.original.title }} —
                {{ result.original.description }}
                <a
                  v-if="result.original.link"
                  :href="result.original.link"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-2"
                >
                  View source
                </a>
              </div>

              <div class="d-flex align-center ga-3 mt-4">
                <v-btn
                  color="secondary"
                  size="small"
                  :loading="draftSaving[result.articleId]"
                  :disabled="!!result.draft || !!draftSaving[result.articleId]"
                  @click="saveDraft(result)"
                >
                  {{ result.draft ? "Draft Saved" : "Save Draft" }}
                </v-btn>
                <div
                  v-if="result.draft"
                  class="text-caption text-success"
                >
                  Saved as
                  <a
                    :href="`/articles/${result.draft.slug}`"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {{ result.draft.slug }}
                  </a>
                </div>
              </div>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
    </v-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted } from "vue";
import { useAdminAiBots } from "@/composables/useAdminAiBots";
import {
  useAdminNewsmesh,
  type NewsmeshQueryParams,
  type NewsmeshRewriteReference,
} from "@/composables/useAdminNewsmesh";
import { useMarkdown } from "@/composables/useMarkdown";

type NewsmeshArticleRow = {
  id: string;
  stream: string;
  title: string | null;
  description: string | null;
  link: string | null;
  source: string | null;
  category: string | null;
  topics: unknown;
  people: unknown;
  published_date: string | null;
  last_seen_at: string | null;
};

type RewriteReference = NewsmeshRewriteReference;

type DraftArticle = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  persona_key: string | null;
  persona_id: string | null;
};

type NewsmeshRewriteResult = {
  articleId: string;
  stream: string;
  personaKey: string;
  original: {
    title: string | null;
    description: string | null;
    link: string | null;
    source: string | null;
    published_date?: string | null;
  };
  rewrite: {
    headline: string;
    summary: string;
    body: string;
    references: RewriteReference[];
    social?: {
      facebook?: { caption?: string | null };
      instagram?: { caption?: string | null };
    };
    raw: string;
  };
  draft?: DraftArticle;
};

type NewsmeshRewritePrompt = {
  articleId: string;
  stream: string;
  prompt: string;
  sourceText: string | null;
  original: {
    title: string | null;
    description: string | null;
    link: string | null;
    source: string | null;
    published_date: string | null;
  };
};

type AdminBot = {
  persona_key: string;
  model: string;
  is_active?: boolean;
  profile?: { displayname?: string | null };
};

const MAX_BATCH = 5;
const PAGE_SIZE = 100;

const { listBots } = useAdminAiBots();
const {
  fetchArticles,
  rewriteArticles,
  previewRewritePrompts,
  saveRewriteDraft,
  triggerIngest,
  deleteArticles,
} = useAdminNewsmesh();
const { init: initMarkdown, render: mdRender } = useMarkdown();

const tableHeaders = [
  { title: "Title", key: "title", sortable: false },
  { title: "Stream", key: "stream", width: 120, sortable: false },
  { title: "Source & people", key: "source", width: 220, sortable: false },
  { title: "Timestamps", key: "published_date", width: 180, sortable: false },
];

const streamOptions = [
  { title: "All streams", value: "all" },
  { title: "Trending", value: "trending" },
  { title: "Latest", value: "latest" },
];

const statusOptions = [
  { title: "All statuses", value: "all" },
  { title: "Raw", value: "raw" },
  { title: "Enriched", value: "enriched" },
  { title: "Published", value: "published" },
];

const filters = reactive({
  stream: "all",
  status: "all",
  search: "",
});

const articles = ref<NewsmeshArticleRow[]>([]);
const meta = reactive({
  total: 0,
});
const selectedIds = ref<string[]>([]);
const loadingArticles = ref(false);
const articlesError = ref("");
const ingesting = ref(false);
const ingestError = ref("");
const ingestSuccess = ref("");

const bots = ref<AdminBot[]>([]);
const loadingBots = ref(false);
const activeBots = computed(() =>
  bots.value.filter((bot) => bot.is_active !== false)
);
const botOptions = computed(() =>
  activeBots.value.map((bot) => ({
    label: `${bot.profile?.displayname || bot.persona_key} (${bot.model})`,
    value: bot.persona_key,
  }))
);
const selectedPersona = ref("");
const instructions = ref("");
const rewriteError = ref("");
const draftError = ref("");
const rewriting = ref(false);
const deleting = ref(false);
const rewriteResults = ref<NewsmeshRewriteResult[]>([]);
const draftSaving = reactive<Record<string, boolean>>({});
const deleteError = ref("");
const promptDialog = ref(false);
const promptLoading = ref(false);
const promptError = ref("");
const promptDrafts = ref<NewsmeshRewritePrompt[]>([]);

const SOURCE_TEXT_MIN = 800;

const canRewrite = computed(
  () => !!selectedPersona.value && selectedIds.value.length > 0 && !rewriting.value
);
const hasSelection = computed(() => selectedIds.value.length > 0);

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString();
};

const toDisplayList = (value: unknown): string[] => {
  if (!value) return [];
  if (Array.isArray(value))
    return value.map(String).filter((item) => item && item !== "null");
  if (typeof value === "object") {
    return Object.values(value)
      .map(String)
      .filter((item) => item && item !== "null");
  }
  if (typeof value === "string" && value.trim()) return [value.trim()];
  return [];
};

const renderMarkdown = (content?: string | null) => mdRender(content || "");

const runIngest = async () => {
  ingestError.value = "";
  ingestSuccess.value = "";
  ingesting.value = true;

  try {
    const response = await triggerIngest();
    if (!response?.success) {
      throw new Error(response?.error || "Failed to trigger ingest");
    }

    const message =
      typeof response?.data === "string"
        ? response.data
        : response?.data?.message ||
          response?.data?.status ||
          "Newsmesh ingest started. Refresh again in a moment.";

    ingestSuccess.value = message;
    await loadArticles();
  } catch (error: any) {
    console.error("[NewsmeshAdmin] ingest error", error);
    ingestError.value =
      error?.message || "Unable to trigger Newsmesh ingest right now.";
  } finally {
    ingesting.value = false;
  }
};

const loadArticles = async () => {
  loadingArticles.value = true;
  articlesError.value = "";
  try {
    const params: NewsmeshQueryParams = {
      stream: filters.stream !== "all" ? filters.stream : undefined,
      status: filters.status !== "all" ? filters.status : undefined,
      search: filters.search || undefined,
    };

    let page = 1;
    let total = 0;
    const allArticles: NewsmeshArticleRow[] = [];

    // Fetch all pages so the table can scroll through the full dataset
    while (true) {
      const response = await fetchArticles({
        ...params,
        page,
        pageSize: PAGE_SIZE,
      });

      if (!response?.success) {
        throw new Error(response?.error || "Failed to load articles");
      }

      const pageItems = response.data || [];
      total = response.meta?.total ?? total;
      allArticles.push(...pageItems);

      const fetched = allArticles.length;
      const pageSize = response.meta?.pageSize || PAGE_SIZE;
      const expectedTotal = total || fetched;

      if (
        !pageItems.length ||
        fetched >= expectedTotal ||
        pageItems.length < pageSize
      ) {
        break;
      }

      page += 1;
    }

    articles.value = allArticles;
    meta.total = total || allArticles.length;
    selectedIds.value = selectedIds.value.filter((id) =>
      articles.value.some((article) => article.id === id)
    );
  } catch (error: any) {
    console.error("[NewsmeshAdmin] loadArticles error", error);
    articlesError.value =
      error?.message || "Unable to load Newsmesh data right now.";
  } finally {
    loadingArticles.value = false;
  }
};

const loadBots = async () => {
  loadingBots.value = true;
  try {
    const response = await listBots();
    if (!response?.success) {
      throw new Error(response?.error || "Unable to load bots");
    }
    bots.value = response.data || [];
    if (!selectedPersona.value && activeBots.value.length) {
      selectedPersona.value = activeBots.value[0].persona_key;
    }
  } catch (error: any) {
    console.error("[NewsmeshAdmin] loadBots error", error);
    rewriteError.value = error?.message || "Failed to load AI bots.";
  } finally {
    loadingBots.value = false;
  }
};

const setDraftSaving = (articleId: string, value: boolean) => {
  if (!articleId) return;
  if (value) {
    draftSaving[articleId] = true;
  } else {
    delete draftSaving[articleId];
  }
};

const saveDraft = async (result: NewsmeshRewriteResult) => {
  if (!result || !result.articleId || result.draft) return;
  draftError.value = "";
  setDraftSaving(result.articleId, true);
  try {
    const response = await saveRewriteDraft({
      articleId: result.articleId,
      personaKey: result.personaKey || selectedPersona.value,
      rewrite: {
        headline: result.rewrite.headline,
        summary: result.rewrite.summary,
        body: result.rewrite.body,
        references: result.rewrite.references || [],
        social: result.rewrite.social || null,
      },
    });

    if (!response?.success || !response?.data) {
      throw new Error(response?.error || "Failed to save draft.");
    }

    result.draft = response.data;
  } catch (error: any) {
    console.error("[NewsmeshAdmin] save draft error", error);
    draftError.value =
      error?.message || "Unable to save the draft article right now.";
  } finally {
    setDraftSaving(result.articleId, false);
  }
};

const openPromptDialog = async () => {
  if (!canRewrite.value) return;
  promptError.value = "";
  promptDrafts.value = [];
  promptLoading.value = true;
  promptDialog.value = true;
  try {
    const response = await previewRewritePrompts({
      articleIds: selectedIds.value,
      instructions: instructions.value || undefined,
    });

    if (!response?.success) {
      throw new Error(response?.error || "Failed to build prompts");
    }

    promptDrafts.value = response.data || [];
  } catch (error: any) {
    console.error("[NewsmeshAdmin] prompt preview error", error);
    promptError.value =
      error?.message || "Unable to build prompts. Please try again.";
  } finally {
    promptLoading.value = false;
  }
};

const confirmRewrite = async () => {
  if (!canRewrite.value || !promptDrafts.value.length) return;
  rewriteError.value = "";
  draftError.value = "";
  Object.keys(draftSaving).forEach((key) => delete draftSaving[key]);
  rewriting.value = true;
  try {
    const promptOverrides = promptDrafts.value.reduce<Record<string, string>>(
      (acc, draft) => {
        if (draft.prompt?.trim()) {
          acc[draft.articleId] = draft.prompt.trim();
        }
        return acc;
      },
      {}
    );

    const response = await rewriteArticles({
      articleIds: selectedIds.value,
      personaKey: selectedPersona.value,
      instructions: instructions.value || undefined,
      promptOverrides,
    });

    if (!response?.success) {
      throw new Error(response?.error || "Rewrite failed");
    }

    rewriteResults.value = response.data || [];
    promptDialog.value = false;
  } catch (error: any) {
    console.error("[NewsmeshAdmin] rewrite error", error);
    rewriteError.value =
      error?.message ||
      "Unable to rewrite articles at the moment. Please try again.";
  } finally {
    rewriting.value = false;
  }
};

const deleteSelected = async () => {
  if (!hasSelection.value || deleting.value) return;
  deleteError.value = "";
  const confirmed =
    typeof window === "undefined" ||
    window.confirm(
      `Delete ${selectedIds.value.length} selected article(s)? This cannot be undone.`
    );
  if (!confirmed) return;

  deleting.value = true;
  try {
    const response = await deleteArticles(selectedIds.value);
    if (!response?.success) {
      throw new Error(response?.error || "Failed to delete articles.");
    }

    selectedIds.value = [];
    await loadArticles();
  } catch (error: any) {
    console.error("[NewsmeshAdmin] delete error", error);
    deleteError.value =
      error?.message || "Unable to delete the selected articles right now.";
  } finally {
    deleting.value = false;
  }
};

watch(
  () => ({ ...filters }),
  () => {
    loadArticles();
  }
);

onMounted(async () => {
  await initMarkdown().catch(() => null);
  await Promise.all([loadArticles(), loadBots()]);
});

const maxBatch = MAX_BATCH;
</script>

<style scoped>
.newsmesh-admin {
  width: 100%;
}

.newsmesh-table :deep(tbody tr td) {
  vertical-align: top;
}

.markdown-body :deep(p) {
  margin-bottom: 0.75rem;
}
</style>
