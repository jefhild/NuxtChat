<template>
  <v-card class="pa-4 pa-md-6" elevation="0">
    <!-- Header -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-6">
      <div>
        <div class="text-overline text-medium-emphasis">SEO Intelligence</div>
        <h3 class="text-h6 font-weight-bold">Daily SEO performance & recommendations</h3>
        <p class="text-body-2 text-medium-emphasis">
          Powered by Google Search Console + Bing Webmaster Tools. Updates daily at 6 AM UTC.
        </p>
      </div>

      <div class="d-flex ga-2 align-center flex-wrap">
        <v-chip v-if="lastSnapshotDate" size="small" variant="tonal" color="success" prepend-icon="mdi-clock-check-outline">
          Last snapshot: {{ lastSnapshotDate }}
        </v-chip>
        <v-btn
          color="primary"
          variant="tonal"
          prepend-icon="mdi-refresh"
          :loading="running"
          @click="runNow"
        >
          Run now
        </v-btn>
      </div>
    </div>

    <!-- Run result feedback -->
    <v-alert
      v-if="runResult"
      :type="runResult.errors?.length ? 'warning' : 'success'"
      variant="tonal"
      density="compact"
      class="mb-4"
      closable
      @click:close="runResult = null"
    >
      <span v-if="runResult.errors?.length === 0">
        Snapshot complete — {{ runResult.gscPages }} Google pages, {{ runResult.bingPages }} Bing pages. Brief generated.
      </span>
      <span v-else>
        Completed with issues: {{ runResult.errors.join(' · ') }}
      </span>
    </v-alert>

    <v-alert
      v-if="configWarning"
      type="warning"
      variant="tonal"
      density="compact"
      class="mb-4"
    >
      <strong>Credentials not yet configured.</strong>
      Add <code>GSC_SERVICE_ACCOUNT_KEY</code>, <code>GSC_SITE_URL</code>,
      <code>BING_WEBMASTER_API_KEY</code>, and <code>BING_SITE_URL</code> to your
      <code>.env</code> file to start collecting data.
      <a href="https://developers.google.com/webmaster-tools/about" target="_blank" class="ml-1">GSC docs</a> ·
      <a href="https://www.bing.com/webmasters/help/bing-webmaster-tools-api-1d7a73e0" target="_blank" class="ml-1">Bing docs</a>
    </v-alert>

    <!-- Tabs -->
    <v-tabs v-model="tab" class="mb-4">
      <v-tab value="brief">Today's Brief</v-tab>
      <v-tab value="trends">Page Trends</v-tab>
      <v-tab value="suggestions">Suggestions</v-tab>
      <v-tab value="history">History</v-tab>
    </v-tabs>

    <v-tabs-window v-model="tab">
      <!-- Brief tab -->
      <v-tabs-window-item value="brief">
        <Admin2SeoIntelligenceBriefCard
          :brief="latestBrief"
          :loading="loadingBriefs"
        />
      </v-tabs-window-item>

      <!-- Trends tab -->
      <v-tabs-window-item value="trends">
        <Admin2SeoIntelligenceTrendTable
          :rows="snapshots"
          :loading="loadingSnapshots"
        />
      </v-tabs-window-item>

      <!-- Suggestions tab -->
      <v-tabs-window-item value="suggestions">
        <Admin2SeoIntelligenceSuggestionList
          :items="latestBrief?.pages_to_create ?? []"
          :loading="loadingBriefs"
          :existing-page-map="existingPageMap"
          @created="loadExistingPages"
        />
      </v-tabs-window-item>

      <!-- History tab -->
      <v-tabs-window-item value="history">
        <div class="text-overline text-medium-emphasis mb-3">Brief history</div>
        <v-skeleton-loader v-if="loadingBriefs" type="list-item-two-line@5" />
        <v-expansion-panels v-else variant="accordion">
          <v-expansion-panel
            v-for="brief in briefs"
            :key="brief.id"
            :title="brief.brief_date + ' — ' + (brief.headline ?? 'No headline')"
          >
            <v-expansion-panel-text>
              <Admin2SeoIntelligenceBriefCard :brief="brief" :loading="false" />
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
        <v-alert v-if="!loadingBriefs && !briefs.length" type="info" variant="tonal" density="compact">
          No briefs yet — run a snapshot to generate your first brief.
        </v-alert>
      </v-tabs-window-item>
    </v-tabs-window>
  </v-card>
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
const briefs = ref<SeoBrief[]>([]);
const snapshots = ref<SnapshotRow[]>([]);
const loadingBriefs = ref(true);
const loadingSnapshots = ref(true);
const running = ref(false);
const runResult = ref<RunResult | null>(null);
const configWarning = ref(false);

interface ExistingPageEntry { isPublished: boolean; path: string }
const existingPages = ref<{ slug: string; isPublished: boolean; path: string }[]>([]);
const existingPageMap = computed(() => {
  const map = new Map<string, ExistingPageEntry>();
  for (const p of existingPages.value) map.set(p.slug, { isPublished: p.isPublished, path: p.path });
  return map;
});

const latestBrief = computed(() => briefs.value[0] ?? null);
const lastSnapshotDate = computed(() => snapshots.value[0]?.snapshot_date ?? null);

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
