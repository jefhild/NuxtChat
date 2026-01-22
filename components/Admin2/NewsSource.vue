<template>
  <div class="news-source-admin d-flex flex-column ga-6">
    <v-card class="pa-4" elevation="3">
      <v-card-title class="d-flex align-center ga-3">
        <div class="text-h6">Add News Source</div>
        <v-chip variant="tonal" size="small" v-if="urlResults.length">
          {{ urlResults.length }} draft{{ urlResults.length === 1 ? "" : "s" }}
        </v-chip>
        <v-spacer />
        <v-btn
          icon="mdi-robot-happy-outline"
          variant="text"
          :disabled="loadingBots"
          :loading="loadingBots"
          @click="loadBots"
        />
      </v-card-title>
      <v-card-subtitle>
        Paste a URL, pick a persona, and generate the same draft/validate flow
        as Newsmesh without touching the Newsmesh feeds.
      </v-card-subtitle>

      <v-card-text>
        <v-alert
          v-if="rewriteError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="rewriteError = ''"
        >
          {{ rewriteError }}
        </v-alert>

        <v-row dense>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="sourceUrl"
              label="Source URL"
              prepend-inner-icon="mdi-link-variant"
              placeholder="https://example.com/news/story"
              hide-details="auto"
            />
          </v-col>
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
          <v-col cols="12">
            <v-textarea
              v-model="instructions"
              label="Extra guidance (optional)"
              rows="3"
              auto-grow
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <div class="d-flex align-center ga-3 mt-2 flex-wrap">
          <v-btn
            color="primary"
            :disabled="!canRewrite"
            :loading="rewriting"
            @click="runRewrite"
          >
            Review URL with AI
          </v-btn>
          <v-btn
            variant="text"
            :disabled="rewriting"
            @click="resetForm"
          >
            Clear
          </v-btn>
          <span class="text-caption text-medium-emphasis">
            We keep the URL with the draft so you can validate it later.
          </span>
        </div>
      </v-card-text>
    </v-card>

    <v-card class="pa-4" elevation="3">
      <v-card-title class="d-flex align-center ga-3">
        <div class="text-h6">Manual Article Rewrite</div>
        <v-spacer />
      </v-card-title>
      <v-card-subtitle>
        Provide the article text directly and review the prompt before the AI rewrite.
      </v-card-subtitle>
      <v-card-text>
        <v-alert
          v-if="manualError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="manualError = ''"
        >
          {{ manualError }}
        </v-alert>

        <v-row dense>
          <v-col cols="12" md="8">
            <v-text-field
              v-model="manualTitle"
              label="Title"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field
              v-model="manualLink"
              label="Source URL"
              placeholder="https://example.com/article"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="manualSource"
              label="Source name (optional)"
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="manualCategory"
              :items="categories"
              :loading="loadingCategories"
              item-title="name"
              item-value="name"
              label="Category (optional)"
              clearable
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="manualSummary"
              label="Summary (optional)"
              rows="2"
              auto-grow
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12">
            <v-textarea
              v-model="manualBody"
              label="Article body"
              rows="8"
              auto-grow
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-combobox
              v-model="manualTopics"
              label="Topics (optional)"
              multiple
              chips
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="6">
            <v-combobox
              v-model="manualPeople"
              label="People (optional)"
              multiple
              chips
              hide-details="auto"
            />
          </v-col>
          <v-col cols="12" md="4">
            <v-select
              v-model="manualPersona"
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
              v-model="manualInstructions"
              label="Extra guidance (optional)"
              rows="2"
              auto-grow
              hide-details="auto"
            />
          </v-col>
        </v-row>

        <div class="d-flex align-center ga-3 mt-2 flex-wrap">
          <v-btn
            color="primary"
            :disabled="!canManualRewrite"
            :loading="manualPromptLoading || manualRewriting"
            @click="openManualPromptDialog"
          >
            Review Prompt & Rewrite
          </v-btn>
          <v-btn
            variant="text"
            :disabled="manualRewriting"
            @click="resetManualForm"
          >
            Clear
          </v-btn>
          <span class="text-caption text-medium-emphasis">
            Manual entries skip scraping and use your supplied body text.
          </span>
        </div>
      </v-card-text>
    </v-card>

    <v-dialog v-model="manualPromptDialog" max-width="1000">
      <v-card class="pa-2">
        <v-card-title class="d-flex align-center ga-3">
          <div class="text-h6">Review Prompt</div>
          <v-spacer />
        </v-card-title>
        <v-card-text>
          <v-alert
            v-if="manualPromptError"
            type="error"
            variant="tonal"
            class="mb-4"
            closable
            @click:close="manualPromptError = ''"
          >
            {{ manualPromptError }}
          </v-alert>

          <v-progress-linear
            v-if="manualPromptLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <div v-if="!manualPromptLoading && !manualPromptDraft">
            No prompt available yet.
          </div>

          <div v-else-if="manualPromptDraft">
            <v-alert
              v-if="manualPromptDraft && manualPromptDraft.sourceText && manualPromptDraft.sourceText.length < SOURCE_TEXT_MIN"
              type="warning"
              variant="tonal"
              class="mb-3"
            >
              Source text is short ({{ manualPromptDraft.sourceText.length }} chars). The
              rewrite may lack concrete details.
            </v-alert>
            <v-textarea
              v-model="manualPromptDraft.prompt"
              label="Rewrite prompt"
              rows="12"
              auto-grow
              hide-details="auto"
            />
            <div class="text-caption text-medium-emphasis mt-2">
              Edit the prompt before sending it to the model.
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="d-flex align-center">
          <v-spacer />
          <v-btn variant="text" @click="manualPromptDialog = false">
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            :disabled="manualPromptLoading || !manualPromptDraft || !canManualRewrite"
            :loading="manualRewriting"
            @click="confirmManualRewrite"
          >
            Send to AI
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-card
      v-if="manualResults.length"
      class="pa-4"
      elevation="3"
      data-testid="manual-rewrites"
    >
      <v-card-title class="text-h6">
        Draft Rewrites from Manual Entries (latest {{ manualResults.length }})
      </v-card-title>
      <v-card-text>
        <v-alert
          v-if="manualDraftError"
          type="error"
          variant="tonal"
          class="mb-4"
          closable
          @click:close="manualDraftError = ''"
        >
          {{ manualDraftError }}
        </v-alert>
        <v-expansion-panels multiple>
          <v-expansion-panel
            v-for="result in manualResults"
            :key="result.id"
          >
            <v-expansion-panel-title>
              <div class="d-flex flex-column text-left">
                <div class="font-weight-medium">
                  {{ result.rewrite.headline }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ result.original.source || "Manual entry" }} ·
                  Manual text
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

              <v-divider class="my-4" />

              <div class="text-caption text-medium-emphasis">
                <strong>Original:</strong>
                {{ result.original.title || "Untitled" }} —
                {{ result.original.description }}
                <a
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
                  :loading="manualDraftSaving[result.id]"
                  :disabled="!!result.draft || !!manualDraftSaving[result.id]"
                  @click="saveManualDraft(result)"
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

    <v-card
      v-if="urlResults.length"
      class="pa-4"
      elevation="3"
      data-testid="url-rewrites"
    >
      <v-card-title class="text-h6">
        Draft Rewrites from URLs (latest {{ urlResults.length }})
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
            v-for="result in urlResults"
            :key="result.id"
          >
            <v-expansion-panel-title>
              <div class="d-flex flex-column text-left">
                <div class="font-weight-medium">
                  {{ result.rewrite.headline }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ result.original.source || "Source unknown" }} ·
                  Manual URL
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

              <v-divider class="my-4" />

              <div class="text-caption text-medium-emphasis">
                <strong>Original:</strong>
                {{ result.original.title || "Untitled" }} —
                {{ result.original.description }}
                <a
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
                  :loading="draftSaving[result.id]"
                  :disabled="!!result.draft || !!draftSaving[result.id]"
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
import { reactive, ref, computed, onMounted } from "vue";
import { useAdminAiBots } from "@/composables/useAdminAiBots";
import {
  useAdminNewsSource,
  type UrlDraftPayload,
} from "@/composables/useAdminNewsSource";
import { useMarkdown } from "@/composables/useMarkdown";

type RewriteReference = { label: string; url?: string | null };

type RewritePayload = {
  headline: string;
  summary: string;
  body: string;
  references: RewriteReference[];
  social?: {
    facebook?: { caption?: string | null; link?: string | null };
    instagram?: { caption?: string | null; image_url?: string | null };
  } | null;
  raw?: string;
};

type DraftArticle = {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
  persona_key: string | null;
  persona_id: string | null;
};

type UrlRewriteResult = {
  id: string;
  sourceUrl: string;
  sourceTitle: string | null;
  sourceSummary: string | null;
  sourceDomain: string | null;
  personaKey: string;
  category?: string | null;
  topics?: string[];
  people?: string[];
  original: {
    title: string | null;
    description: string | null;
    link: string;
    source: string | null;
    published_date?: string | null;
  };
  rewrite: RewritePayload;
  draft?: DraftArticle;
};

type ManualPromptDraft = {
  prompt: string;
  sourceText: string | null;
  original: {
    title: string | null;
    description: string | null;
    link: string | null;
    source: string | null;
    published_date: string | null;
  };
  meta: {
    category: string | null;
    topics: string[];
    people: string[];
  };
};

type ManualRewriteInput = {
  title: string;
  summary?: string;
  body: string;
  link: string;
  source?: string;
  category?: string;
  topics?: string[];
  people?: string[];
  instructions?: string;
};

const { listBots } = useAdminAiBots();
const { rewriteFromUrl, previewManualRewrite, rewriteManual, saveUrlDraft } =
  useAdminNewsSource();
const { init: initMarkdown, render: mdRender } = useMarkdown();
const { getAllCategories } = useDb();

const bots = ref<any[]>([]);
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

const sourceUrl = ref("");
const selectedPersona = ref("");
const instructions = ref("");

const rewriteError = ref("");
const draftError = ref("");
const rewriting = ref(false);
const urlResults = ref<UrlRewriteResult[]>([]);
const draftSaving = reactive<Record<string, boolean>>({});

const categories = ref<Array<{ id?: number; name?: string }>>([]);
const loadingCategories = ref(false);

const manualTitle = ref("");
const manualSummary = ref("");
const manualBody = ref("");
const manualLink = ref("");
const manualSource = ref("");
const manualCategory = ref("");
const manualTopics = ref<string[]>([]);
const manualPeople = ref<string[]>([]);
const manualPersona = ref("");
const manualInstructions = ref("");
const manualError = ref("");
const manualPromptDialog = ref(false);
const manualPromptLoading = ref(false);
const manualPromptError = ref("");
const manualPromptDraft = ref<ManualPromptDraft | null>(null);
const manualRewriting = ref(false);
const manualResults = ref<UrlRewriteResult[]>([]);
const manualDraftSaving = reactive<Record<string, boolean>>({});
const manualDraftError = ref("");
const manualPromptPayload = ref<ManualRewriteInput | null>(null);

const SOURCE_TEXT_MIN = 800;

const canRewrite = computed(
  () =>
    !!sourceUrl.value &&
    !!selectedPersona.value &&
    !rewriting.value &&
    /^https?:\/\//i.test(sourceUrl.value.trim())
);

const canManualRewrite = computed(
  () =>
    !!manualTitle.value.trim() &&
    !!manualBody.value.trim() &&
    !!manualPersona.value &&
    !!manualLink.value.trim() &&
    /^https?:\/\//i.test(manualLink.value.trim()) &&
    !manualRewriting.value
);

const renderMarkdown = (content?: string | null) => mdRender(content || "");

const loadCategories = async () => {
  loadingCategories.value = true;
  try {
    const response = await getAllCategories();
    categories.value = Array.isArray(response) ? response : [];
  } catch (error: any) {
    console.warn("[NewsSource] loadCategories error", error);
    manualError.value =
      error?.message || "Unable to load categories right now.";
  } finally {
    loadingCategories.value = false;
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
    if (!manualPersona.value && activeBots.value.length) {
      manualPersona.value = activeBots.value[0].persona_key;
    }
  } catch (error: any) {
    console.error("[NewsSource] loadBots error", error);
    rewriteError.value = error?.message || "Failed to load AI bots.";
  } finally {
    loadingBots.value = false;
  }
};

const resetForm = () => {
  sourceUrl.value = "";
  instructions.value = "";
  rewriteError.value = "";
};

const resetManualForm = () => {
  manualTitle.value = "";
  manualSummary.value = "";
  manualBody.value = "";
  manualLink.value = "";
  manualSource.value = "";
  manualCategory.value = "";
  manualTopics.value = [];
  manualPeople.value = [];
  manualInstructions.value = "";
  manualError.value = "";
};

const runRewrite = async () => {
  if (!canRewrite.value) return;
  rewriteError.value = "";
  draftError.value = "";
  Object.keys(draftSaving).forEach((key) => delete draftSaving[key]);
  rewriting.value = true;

  try {
    const response = await rewriteFromUrl({
      url: sourceUrl.value.trim(),
      personaKey: selectedPersona.value,
      instructions: instructions.value || undefined,
    });

    if (!response?.success || !response?.data) {
      throw new Error(response?.error || "Rewrite failed");
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    urlResults.value = [
      {
        id,
        sourceUrl: response.data.sourceUrl,
        sourceTitle: response.data.sourceTitle || null,
        sourceSummary: response.data.sourceSummary || null,
        sourceDomain: response.data.sourceDomain || null,
        personaKey: response.data.personaKey,
        original: {
          title: response.data.original?.title || response.data.sourceTitle,
          description:
            response.data.original?.description || response.data.sourceSummary,
          link: response.data.original?.link || response.data.sourceUrl,
          source: response.data.original?.source || response.data.sourceDomain,
        },
        rewrite: response.data.rewrite,
      },
      ...urlResults.value,
    ];
  } catch (error: any) {
    console.error("[NewsSource] rewrite error", error);
    rewriteError.value =
      error?.message ||
      "Unable to rewrite the URL at the moment. Please try again.";
  } finally {
    rewriting.value = false;
  }
};

const setDraftSaving = (id: string, value: boolean) => {
  if (!id) return;
  if (value) {
    draftSaving[id] = true;
  } else {
    delete draftSaving[id];
  }
};

const setManualDraftSaving = (id: string, value: boolean) => {
  if (!id) return;
  if (value) {
    manualDraftSaving[id] = true;
  } else {
    delete manualDraftSaving[id];
  }
};

const saveDraft = async (result: UrlRewriteResult) => {
  if (!result || result.draft) return;
  draftError.value = "";
  setDraftSaving(result.id, true);

  const payload: UrlDraftPayload = {
    sourceUrl: result.sourceUrl,
    personaKey: result.personaKey || selectedPersona.value,
    sourceTitle: result.sourceTitle,
    sourceSummary: result.sourceSummary,
    sourceDomain: result.sourceDomain,
    rewrite: {
      headline: result.rewrite.headline,
      summary: result.rewrite.summary,
      body: result.rewrite.body,
      references: result.rewrite.references || [],
      social: result.rewrite.social || null,
      raw: result.rewrite.raw,
    },
  };

  try {
    const response = await saveUrlDraft(payload);
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || "Failed to save draft.");
    }
    result.draft = response.data;
  } catch (error: any) {
    console.error("[NewsSource] save draft error", error);
    draftError.value =
      error?.message || "Unable to save the draft article right now.";
  } finally {
    setDraftSaving(result.id, false);
  }
};

const saveManualDraft = async (result: UrlRewriteResult) => {
  if (!result || result.draft) return;
  manualDraftError.value = "";
  setManualDraftSaving(result.id, true);

  const payload: UrlDraftPayload = {
    sourceUrl: result.sourceUrl,
    personaKey: result.personaKey || manualPersona.value,
    sourceTitle: result.sourceTitle,
    sourceSummary: result.sourceSummary,
    sourceDomain: result.sourceDomain,
    category: result.category || null,
    topics: result.topics || [],
    people: result.people || [],
    rewrite: {
      headline: result.rewrite.headline,
      summary: result.rewrite.summary,
      body: result.rewrite.body,
      references: result.rewrite.references || [],
      social: result.rewrite.social || null,
      raw: result.rewrite.raw,
    },
  };

  try {
    const response = await saveUrlDraft(payload);
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || "Failed to save draft.");
    }
    result.draft = response.data;
  } catch (error: any) {
    console.error("[NewsSource] save manual draft error", error);
    manualDraftError.value =
      error?.message || "Unable to save the draft article right now.";
  } finally {
    setManualDraftSaving(result.id, false);
  }
};

const openManualPromptDialog = async () => {
  if (!canManualRewrite.value) return;
  manualPromptError.value = "";
  manualError.value = "";
  manualPromptDraft.value = null;
  manualPromptLoading.value = true;
  manualPromptDialog.value = true;

  const payload = {
    title: manualTitle.value.trim(),
    summary: manualSummary.value.trim() || undefined,
    body: manualBody.value.trim(),
    link: manualLink.value.trim(),
    source: manualSource.value.trim() || undefined,
    category: manualCategory.value.trim() || undefined,
    topics: manualTopics.value,
    people: manualPeople.value,
    instructions: manualInstructions.value || undefined,
  };

  manualPromptPayload.value = payload;

  try {
    const response = await previewManualRewrite(payload);
    if (!response?.success || !response?.data) {
      throw new Error(response?.error || "Failed to build prompt");
    }

    manualPromptDraft.value = {
      prompt: response.data.prompt || "",
      sourceText: response.data.sourceText || null,
      original: response.data.original,
      meta: response.data.meta || {
        category: payload.category || null,
        topics: payload.topics || [],
        people: payload.people || [],
      },
    };
  } catch (error: any) {
    console.error("[NewsSource] manual prompt preview error", error);
    manualPromptError.value =
      error?.message || "Unable to build prompt preview.";
  } finally {
    manualPromptLoading.value = false;
  }
};

const confirmManualRewrite = async () => {
  if (!canManualRewrite.value || !manualPromptDraft.value) return;
  manualError.value = "";
  manualDraftError.value = "";
  Object.keys(manualDraftSaving).forEach((key) => delete manualDraftSaving[key]);
  manualRewriting.value = true;

  try {
    const payload = manualPromptPayload.value;
    if (!payload) {
      throw new Error("Missing manual payload.");
    }

    const response = await rewriteManual({
      ...payload,
      personaKey: manualPersona.value,
      instructions: manualInstructions.value || undefined,
      promptOverride: manualPromptDraft.value.prompt?.trim() || undefined,
    });

    if (!response?.success || !response?.data) {
      throw new Error(response?.error || "Rewrite failed");
    }

    const id = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    manualResults.value = [
      {
        id,
        sourceUrl: response.data.sourceUrl,
        sourceTitle: response.data.sourceTitle || null,
        sourceSummary: response.data.sourceSummary || null,
        sourceDomain: response.data.sourceDomain || null,
        personaKey: response.data.personaKey,
        category: manualPromptDraft.value?.meta?.category || null,
        topics: manualPromptDraft.value?.meta?.topics || [],
        people: manualPromptDraft.value?.meta?.people || [],
        original: {
          title: response.data.original?.title || response.data.sourceTitle,
          description:
            response.data.original?.description || response.data.sourceSummary,
          link: response.data.original?.link || response.data.sourceUrl,
          source: response.data.original?.source || response.data.sourceDomain,
          published_date: response.data.original?.published_date || null,
        },
        rewrite: response.data.rewrite,
      },
      ...manualResults.value,
    ];
    manualPromptDialog.value = false;
  } catch (error: any) {
    console.error("[NewsSource] manual rewrite error", error);
    manualError.value =
      error?.message ||
      "Unable to rewrite the manual entry at the moment. Please try again.";
  } finally {
    manualRewriting.value = false;
  }
};

onMounted(async () => {
  await initMarkdown().catch(() => null);
  await loadBots();
  await loadCategories();
});
</script>

<style scoped>
.news-source-admin {
  width: 100%;
}

.markdown-body :deep(p) {
  margin-bottom: 0.75rem;
}
</style>
