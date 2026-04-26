<template>
  <section class="seo-trends">
    <div class="seo-trends__kicker">Page trends (last 30 days)</div>

    <div class="seo-trends__toolbar">
      <div class="seo-trends__toggle-group" role="group" aria-label="Filter source">
        <button
          v-for="option in sourceOptions"
          :key="option.value"
          type="button"
          class="seo-trends__toggle"
          :class="{ 'is-active': selectedSource === option.value }"
          @click="selectedSource = option.value"
        >
          {{ option.label }}
        </button>
      </div>

      <label class="seo-trends__search">
        <span class="sr-only">Filter pages</span>
        <input
          v-model="search"
          type="search"
          class="seo-trends__search-input"
          placeholder="Filter pages..."
        >
      </label>
    </div>

    <LoadingContainer v-if="loading" text="Loading trends..." />

    <template v-else>
      <div v-if="paginatedRows.length" class="seo-trends__table-wrap">
        <table class="seo-trends__table">
          <thead>
            <tr>
              <th
                v-for="header in headers"
                :key="header.key"
              >
                <button
                  type="button"
                  class="seo-trends__sort-button"
                  @click="toggleSort(header.key)"
                >
                  <span>{{ header.title }}</span>
                  <span class="seo-trends__sort-indicator" aria-hidden="true">
                    {{ sortIndicator(header.key) }}
                  </span>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in paginatedRows" :key="item.id">
              <td>
                <div class="seo-trends__page-cell">
                  <template v-if="bingQueryLabel(item.page_url)">
                    <span class="seo-trends__pill">query</span>
                    <span>{{ bingQueryLabel(item.page_url) }}</span>
                  </template>
                  <a
                    v-else
                    :href="item.page_url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="seo-trends__link"
                  >
                    {{ shortUrl(item.page_url) }}
                  </a>
                </div>
              </td>
              <td>
                <span class="seo-trends__pill">{{ item.source.toUpperCase() }}</span>
              </td>
              <td class="seo-trends__muted">{{ item.snapshot_date }}</td>
              <td class="seo-trends__strong">{{ item.impressions.toLocaleString() }}</td>
              <td>{{ item.clicks.toLocaleString() }}</td>
              <td :class="metricToneClass(ctrColor(item.ctr))">
                {{ item.ctr != null ? (item.ctr * 100).toFixed(1) + "%" : "—" }}
              </td>
              <td :class="metricToneClass(positionColor(item.avg_position))">
                {{ item.avg_position != null && item.avg_position > 0 ? item.avg_position.toFixed(1) : "—" }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div v-else class="seo-trends__empty-state">
        No trend rows match the current filters.
      </div>

      <div v-if="filteredRows.length" class="seo-trends__footer">
        <div class="seo-trends__summary">
          Showing {{ pageStart }}–{{ pageEnd }} of {{ filteredRows.length }}
        </div>
        <div class="seo-trends__pagination">
          <button
            type="button"
            class="seo-trends__page-button"
            :disabled="page === 1"
            @click="page = Math.max(1, page - 1)"
          >
            Previous
          </button>
          <span class="seo-trends__page-label">Page {{ page }} of {{ totalPages }}</span>
          <button
            type="button"
            class="seo-trends__page-button"
            :disabled="page === totalPages"
            @click="page = Math.min(totalPages, page + 1)"
          >
            Next
          </button>
        </div>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
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

const props = defineProps<{ rows: SnapshotRow[]; loading: boolean }>();

const selectedSource = ref<"all" | "gsc" | "bing">("all");
const search = ref("");
const page = ref(1);
const itemsPerPage = 25;
const sortKey = ref<keyof SnapshotRow | null>(null);
const sortDirection = ref<"asc" | "desc">("asc");
const sourceOptions = [
  { value: "all", label: "All" },
  { value: "gsc", label: "Google" },
  { value: "bing", label: "Bing" },
] as const;

const headers = [
  { title: "Page / Query", key: "page_url" },
  { title: "Source", key: "source" },
  { title: "Date", key: "snapshot_date" },
  { title: "Impressions", key: "impressions" },
  { title: "Clicks", key: "clicks" },
  { title: "CTR", key: "ctr" },
  { title: "Avg Position", key: "avg_position" },
];

const filteredRows = computed(() =>
  props.rows.filter((r) => {
    if (selectedSource.value !== "all" && r.source !== selectedSource.value) return false;
    if (search.value) {
      const term = search.value.toLowerCase();
      const label = bingQueryLabel(r.page_url) ?? shortUrl(r.page_url);
      if (!label.toLowerCase().includes(term)) return false;
    }
    return true;
  })
);

const sortedRows = computed(() => {
  if (!sortKey.value) return filteredRows.value;

  return [...filteredRows.value].sort((a, b) => {
    const direction = sortDirection.value === "asc" ? 1 : -1;
    const key = sortKey.value!;

    if (key === "page_url") {
      const aValue = (bingQueryLabel(a.page_url) ?? shortUrl(a.page_url)).toLowerCase();
      const bValue = (bingQueryLabel(b.page_url) ?? shortUrl(b.page_url)).toLowerCase();
      return aValue.localeCompare(bValue) * direction;
    }

    const aValue = a[key];
    const bValue = b[key];

    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    if (typeof aValue === "number" && typeof bValue === "number") {
      return (aValue - bValue) * direction;
    }

    return String(aValue).localeCompare(String(bValue)) * direction;
  });
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedRows.value.length / itemsPerPage)));
const paginatedRows = computed(() => {
  const start = (page.value - 1) * itemsPerPage;
  return sortedRows.value.slice(start, start + itemsPerPage);
});
const pageStart = computed(() => (filteredRows.value.length ? (page.value - 1) * itemsPerPage + 1 : 0));
const pageEnd = computed(() => Math.min(page.value * itemsPerPage, filteredRows.value.length));

function toggleSort(key: keyof SnapshotRow) {
  if (sortKey.value !== key) {
    sortKey.value = key;
    sortDirection.value = "asc";
    return;
  }

  if (sortDirection.value === "asc") {
    sortDirection.value = "desc";
    return;
  }

  sortKey.value = null;
  sortDirection.value = "asc";
}

function sortIndicator(key: keyof SnapshotRow) {
  if (sortKey.value !== key) return "↕";
  return sortDirection.value === "asc" ? "↑" : "↓";
}

function shortUrl(url: string) {
  try { return new URL(url).pathname; } catch { return url; }
}

function bingQueryLabel(url: string): string | null {
  try {
    const q = new URL(url).searchParams.get("bing_query");
    return q ? decodeURIComponent(q) : null;
  } catch { return null; }
}

function ctrColor(ctr: number | null) {
  if (ctr == null) return "";
  if (ctr >= 0.05) return "success";
  if (ctr >= 0.02) return "warning";
  return "error";
}

function positionColor(pos: number | null) {
  if (pos == null || pos === 0) return "";
  if (pos <= 5) return "success";
  if (pos <= 15) return "warning";
  return "muted";
}

function metricToneClass(tone: string) {
  return tone ? `seo-trends__metric--${tone}` : "";
}

watch(
  () => [selectedSource.value, search.value, props.rows],
  () => {
    page.value = 1;
  },
  { deep: true }
);

watch(totalPages, (value) => {
  if (page.value > value) page.value = value;
});
</script>

<style scoped>
.seo-trends__kicker {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--color-text), 0.62);
}

.seo-trends__toolbar,
.seo-trends__toggle-group,
.seo-trends__footer,
.seo-trends__pagination {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.seo-trends__toolbar,
.seo-trends__footer {
  align-items: center;
  justify-content: space-between;
}

.seo-trends__toolbar {
  margin: 1rem 0;
}

.seo-trends__toggle,
.seo-trends__page-button,
.seo-trends__sort-button {
  border: 1px solid rgba(var(--color-border), 0.88);
  background: rgba(var(--color-surface), 0.98);
  color: rgb(var(--color-text));
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.seo-trends__toggle,
.seo-trends__page-button {
  min-height: 2.45rem;
  border-radius: 14px;
  padding: 0.65rem 0.95rem;
  font-weight: 600;
}

.seo-trends__toggle:hover,
.seo-trends__page-button:hover,
.seo-trends__sort-button:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary), 0.45);
}

.seo-trends__toggle.is-active {
  border-color: rgba(var(--color-primary), 0.42);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.seo-trends__page-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
}

.seo-trends__search {
  width: min(100%, 260px);
}

.seo-trends__search-input {
  width: 100%;
  min-height: 2.7rem;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.9);
  background: rgba(var(--color-surface), 0.96);
  color: rgb(var(--color-text));
  padding: 0.75rem 0.9rem;
}

.seo-trends__search-input:focus {
  outline: none;
  border-color: rgba(var(--color-primary), 0.7);
  box-shadow: 0 0 0 3px rgba(var(--color-primary), 0.16);
}

.seo-trends__table-wrap {
  overflow-x: auto;
}

.seo-trends__table {
  width: 100%;
  border-collapse: collapse;
}

.seo-trends__table th,
.seo-trends__table td {
  padding: 0.9rem 0.8rem;
  border-bottom: 1px solid rgba(var(--color-border), 0.62);
  text-align: left;
  vertical-align: top;
}

.seo-trends__sort-button {
  display: inline-flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
  border: 0;
  padding: 0;
  background: transparent;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(var(--color-text), 0.62);
}

.seo-trends__sort-indicator {
  font-size: 0.86rem;
}

.seo-trends__page-cell {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  color: rgb(var(--color-text));
}

.seo-trends__link {
  color: rgb(var(--color-primary));
  text-decoration: none;
}

.seo-trends__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.3rem 0.65rem;
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-primary));
  font-size: 0.75rem;
  font-weight: 700;
}

.seo-trends__muted,
.seo-trends__summary,
.seo-trends__page-label {
  color: rgba(var(--color-text), 0.62);
}

.seo-trends__strong {
  font-weight: 700;
}

.seo-trends__metric--success {
  color: #15803d;
}

.seo-trends__metric--warning {
  color: #b45309;
}

.seo-trends__metric--error {
  color: #b91c1c;
}

.seo-trends__metric--muted {
  color: rgba(var(--color-text), 0.62);
}

.seo-trends__empty-state {
  border: 1px solid rgba(var(--color-primary), 0.25);
  border-radius: 16px;
  padding: 1rem;
  background: rgba(var(--color-primary), 0.08);
  color: rgba(var(--color-text), 0.82);
  text-align: center;
}

.seo-trends__footer {
  margin-top: 1rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 767px) {
  .seo-trends__toolbar,
  .seo-trends__footer {
    align-items: stretch;
  }

  .seo-trends__search {
    width: 100%;
  }
}
</style>
