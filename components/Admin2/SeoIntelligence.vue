<template>
  <section class="seo-intel-card">
    <div class="seo-intel-card__header">
      <div>
        <div class="seo-intel-kicker">SEO Intelligence</div>
        <h3 class="seo-intel-title">Daily SEO performance & recommendations</h3>
        <p class="seo-intel-subtitle">
          Powered by Google Search Console + Bing Webmaster Tools. Updates daily at 6 AM UTC.
        </p>
      </div>

      <div class="seo-intel-toolbar">
        <span v-if="lastSnapshotDate" class="seo-intel-pill seo-intel-pill--success">
          Last snapshot: {{ lastSnapshotDate }}
        </span>
        <button
          type="button"
          class="seo-intel-button seo-intel-button--primary"
          :disabled="running"
          @click="runNow"
        >
          <span v-if="running" class="seo-intel-button__spinner" aria-hidden="true" />
          Run now
        </button>
      </div>
    </div>

    <div class="seo-intel-card__body">
      <div
        v-if="runResult"
        class="seo-intel-banner"
        :class="runResult.errors?.length ? 'seo-intel-banner--warning' : 'seo-intel-banner--success'"
        role="status"
      >
        <div class="seo-intel-banner__content">
          <span v-if="runResult.errors?.length === 0">
            Snapshot complete — {{ runResult.gscPages }} Google pages, {{ runResult.bingPages }} Bing pages. Brief generated.
          </span>
          <span v-else>
            Completed with issues: {{ runResult.errors.join(" · ") }}
          </span>
        </div>
        <button
          type="button"
          class="seo-intel-banner__close"
          aria-label="Dismiss result message"
          @click="runResult = null"
        >
          ×
        </button>
      </div>

      <div
        v-if="configWarning"
        class="seo-intel-banner seo-intel-banner--warning"
        role="alert"
      >
        <strong>Credentials not yet configured.</strong>
        Add <code>GSC_SERVICE_ACCOUNT_KEY</code>, <code>GSC_SITE_URL</code>,
        <code>BING_WEBMASTER_API_KEY</code>, and <code>BING_SITE_URL</code> to your
        <code>.env</code> file to start collecting data.
        <a href="https://developers.google.com/webmaster-tools/about" target="_blank" rel="noopener noreferrer">GSC docs</a> ·
        <a href="https://www.bing.com/webmasters/help/bing-webmaster-tools-api-1d7a73e0" target="_blank" rel="noopener noreferrer">Bing docs</a>
      </div>

      <div class="seo-intel-tabs" role="tablist" aria-label="SEO intelligence sections">
        <button
          v-for="item in tabs"
          :key="item.value"
          type="button"
          class="seo-intel-tab"
          :class="{ 'is-active': tab === item.value }"
          :aria-selected="tab === item.value"
          role="tab"
          @click="tab = item.value"
        >
          {{ item.label }}
        </button>
      </div>

      <div v-if="tab === 'brief'" class="seo-intel-panel" role="tabpanel">
        <Admin2SeoIntelligenceBriefCard
          :brief="latestBrief"
          :loading="loadingBriefs"
        />
      </div>

      <div v-else-if="tab === 'trends'" class="seo-intel-panel" role="tabpanel">
        <Admin2SeoIntelligenceTrendTable
          :rows="snapshots"
          :loading="loadingSnapshots"
        />
      </div>

      <div v-else-if="tab === 'suggestions'" class="seo-intel-panel" role="tabpanel">
        <Admin2SeoIntelligenceSuggestionList
          :items="latestBrief?.pages_to_create ?? []"
          :loading="loadingBriefs"
          :existing-page-map="existingPageMap"
          @created="loadExistingPages"
        />
      </div>

      <div v-else class="seo-intel-panel" role="tabpanel">
        <div class="seo-intel-history__label">Brief history</div>

        <LoadingContainer v-if="loadingBriefs" text="Loading brief history..." />

        <div v-else-if="briefs.length" class="seo-intel-history">
          <article
            v-for="brief in briefs"
            :key="brief.id"
            class="seo-intel-history-item"
          >
            <button
              type="button"
              class="seo-intel-history-item__trigger"
              :aria-expanded="historyOpenId === brief.id"
              @click="toggleHistory(brief.id)"
            >
              <span class="seo-intel-history-item__headline">
                {{ brief.brief_date }} — {{ brief.headline ?? "No headline" }}
              </span>
              <span class="seo-intel-history-item__icon" aria-hidden="true">
                {{ historyOpenId === brief.id ? "−" : "+" }}
              </span>
            </button>

            <div v-if="historyOpenId === brief.id" class="seo-intel-history-item__body">
              <Admin2SeoIntelligenceBriefCard :brief="brief" :loading="false" />
            </div>
          </article>
        </div>

        <div
          v-else
          class="seo-intel-banner seo-intel-banner--info"
          role="status"
        >
          No briefs yet — run a snapshot to generate your first brief.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
interface SeoBrief {
  id: string;
  brief_date: string;
  headline: string;
  pages_working: { url: string; reason: string; metric: string }[];
  pages_to_optimize: { url: string; issue: string; suggestion: string }[];
  pages_to_create: { suggested_slug: string; page_type?: "landing" | "guide" | "topic" | "compare"; rationale: string; target_queries: string[] }[];
  action_plan: string;
  sources_used: string[];
}

interface SnapshotRow {
  id: string;
  snapshot_date: string;
  source: string;
  page_url: string;
  impressions: number;
  clicks: number;
  ctr: number | null;
  avg_position: number | null;
}

interface RunResult {
  gscPages: number;
  bingPages: number;
  briefGenerated: boolean;
  errors: string[];
}

const tab = ref("brief");
const tabs = [
  { value: "brief", label: "Today's Brief" },
  { value: "trends", label: "Page Trends" },
  { value: "suggestions", label: "Suggestions" },
  { value: "history", label: "History" },
];
const briefs = ref<SeoBrief[]>([]);
const snapshots = ref<SnapshotRow[]>([]);
const loadingBriefs = ref(true);
const loadingSnapshots = ref(true);
const running = ref(false);
const runResult = ref<RunResult | null>(null);
const configWarning = ref(false);
const historyOpenId = ref<string | null>(null);

interface ExistingPageEntry { isPublished: boolean; path: string }
const existingPages = ref<{ slug: string; isPublished: boolean; path: string }[]>([]);
const existingPageMap = computed(() => {
  const map = new Map<string, ExistingPageEntry>();
  for (const p of existingPages.value) map.set(p.slug, { isPublished: p.isPublished, path: p.path });
  return map;
});

const latestBrief = computed(() => briefs.value[0] ?? null);
const lastSnapshotDate = computed(() => snapshots.value[0]?.snapshot_date ?? null);

function toggleHistory(id: string) {
  historyOpenId.value = historyOpenId.value === id ? null : id;
}

async function loadExistingPages() {
  try {
    const { pages } = await $fetch<{ pages: { slug: string; isPublished: boolean; path: string; locale: string }[] }>("/api/admin/seo-pages");
    existingPages.value = (pages ?? []).filter((p) => p.locale === "en");
  } catch (e) {
    console.error("[SeoIntelligence] existing pages fetch error", e);
  }
}

async function loadBriefs() {
  loadingBriefs.value = true;
  try {
    const { data } = await $fetch<{ data: SeoBrief[] }>("/api/admin/seo-briefs");
    briefs.value = data ?? [];
    historyOpenId.value = briefs.value[0]?.id ?? null;
  } catch (e) {
    console.error("[SeoIntelligence] briefs fetch error", e);
  } finally {
    loadingBriefs.value = false;
  }
}

async function loadSnapshots() {
  loadingSnapshots.value = true;
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0];
    const { data } = await $fetch<{ data: SnapshotRow[] }>(`/api/admin/seo-snapshots?from=${thirtyDaysAgo}`);
    snapshots.value = data ?? [];
  } catch (e) {
    console.error("[SeoIntelligence] snapshots fetch error", e);
  } finally {
    loadingSnapshots.value = false;
  }
}

async function runNow() {
  running.value = true;
  runResult.value = null;
  configWarning.value = false;
  try {
    const { result } = await $fetch<{ success: boolean; result: RunResult }>("/api/admin/seo-fetch", { method: "POST" });
    runResult.value = result;
    // Only show credential warning if ALL sources failed with a credentials error
    const credErrors = result.errors.filter((e) => e.toLowerCase().includes("not configured"));
    if (credErrors.length === result.errors.length && result.errors.length > 0 && result.gscPages === 0 && result.bingPages === 0) {
      configWarning.value = true;
    }
    await Promise.all([loadBriefs(), loadSnapshots()]);
  } catch (e: unknown) {
    runResult.value = { gscPages: 0, bingPages: 0, briefGenerated: false, errors: [(e as Error).message] };
  } finally {
    running.value = false;
  }
}

onMounted(() => {
  loadBriefs();
  loadSnapshots();
  loadExistingPages();
});
</script>

<style scoped>
.seo-intel-card {
  border: 1px solid rgba(var(--color-border), 0.88);
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(var(--color-surface-elevated), 0.96), rgba(var(--color-surface), 0.98));
  box-shadow: 0 24px 54px rgba(15, 23, 42, 0.14);
  overflow: hidden;
}

.seo-intel-card__header,
.seo-intel-card__body {
  padding: 1.5rem;
}

.seo-intel-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border-bottom: 1px solid rgba(var(--color-border), 0.65);
}

.seo-intel-kicker,
.seo-intel-history__label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--color-primary));
}

.seo-intel-title {
  margin: 0.3rem 0 0;
  font-size: 1.375rem;
  font-weight: 700;
  color: rgb(var(--color-text));
}

.seo-intel-subtitle {
  margin: 0.55rem 0 0;
  max-width: 52rem;
  color: rgba(var(--color-text), 0.68);
}

.seo-intel-toolbar,
.seo-intel-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.seo-intel-toolbar {
  align-items: center;
}

.seo-intel-pill,
.seo-intel-tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.84rem;
  font-weight: 700;
}

.seo-intel-pill {
  padding: 0.5rem 0.9rem;
  background: rgba(var(--color-text), 0.06);
  color: rgba(var(--color-text), 0.82);
}

.seo-intel-pill--success {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
}

.seo-intel-button,
.seo-intel-tab,
.seo-intel-banner__close {
  border: 1px solid rgba(var(--color-border), 0.88);
  background: rgba(var(--color-surface), 0.98);
  color: rgb(var(--color-text));
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.seo-intel-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  min-height: 2.7rem;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  font-weight: 600;
}

.seo-intel-button:hover,
.seo-intel-tab:hover,
.seo-intel-banner__close:hover,
.seo-intel-history-item__trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary), 0.45);
}

.seo-intel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.seo-intel-button--primary,
.seo-intel-tab.is-active {
  border-color: rgba(var(--color-primary), 0.42);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.seo-intel-button__spinner {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: seo-intel-spin 0.8s linear infinite;
}

.seo-intel-card__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.seo-intel-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 16px;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(var(--color-border), 0.85);
  background: rgba(var(--color-surface), 0.96);
  color: rgba(var(--color-text), 0.88);
}

.seo-intel-banner--success {
  border-color: rgba(34, 197, 94, 0.24);
  background: rgba(34, 197, 94, 0.1);
  color: #166534;
}

.seo-intel-banner--warning {
  border-color: rgba(245, 158, 11, 0.28);
  background: rgba(245, 158, 11, 0.12);
  color: #92400e;
}

.seo-intel-banner--info {
  border-color: rgba(var(--color-primary), 0.25);
  background: rgba(var(--color-primary), 0.1);
  color: rgba(var(--color-text), 0.88);
}

.seo-intel-banner__content {
  flex: 1;
}

.seo-intel-banner__close {
  width: 2rem;
  min-width: 2rem;
  min-height: 2rem;
  border-radius: 999px;
  font-size: 1rem;
  line-height: 1;
}

.seo-intel-banner a {
  color: inherit;
  font-weight: 600;
}

.seo-intel-tab {
  padding: 0.7rem 1rem;
}

.seo-intel-panel {
  min-width: 0;
}

.seo-intel-history {
  display: grid;
  gap: 0.9rem;
}

.seo-intel-history-item {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.88);
  overflow: hidden;
}

.seo-intel-history-item__trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  background: transparent;
  padding: 1rem 1.1rem;
  text-align: left;
  color: rgb(var(--color-text));
  transition: transform 0.18s ease, background 0.18s ease;
}

.seo-intel-history-item__headline {
  font-weight: 700;
}

.seo-intel-history-item__icon {
  font-size: 1.2rem;
  color: rgba(var(--color-text), 0.6);
}

.seo-intel-history-item__body {
  padding: 0 1rem 1rem;
}

@keyframes seo-intel-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .seo-intel-card__header,
  .seo-intel-card__body {
    padding: 1.15rem;
  }

  .seo-intel-banner {
    flex-direction: column;
  }

  .seo-intel-banner__close {
    align-self: flex-end;
  }
}
</style>
