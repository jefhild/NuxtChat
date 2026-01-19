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
  original: {
    title: string | null;
    description: string | null;
    link: string;
    source: string | null;
  };
  rewrite: RewritePayload;
  draft?: DraftArticle;
};

const { listBots } = useAdminAiBots();
const { rewriteFromUrl, saveUrlDraft } = useAdminNewsSource();
const { init: initMarkdown, render: mdRender } = useMarkdown();

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

const canRewrite = computed(
  () =>
    !!sourceUrl.value &&
    !!selectedPersona.value &&
    !rewriting.value &&
    /^https?:\/\//i.test(sourceUrl.value.trim())
);

const renderMarkdown = (content?: string | null) => mdRender(content || "");

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

onMounted(async () => {
  await initMarkdown().catch(() => null);
  await loadBots();
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
