<template>
  <v-card elevation="0" class="pa-0">
    <div class="text-overline text-medium-emphasis mb-3">Page trends (last 30 days)</div>

    <div class="d-flex ga-2 mb-3 flex-wrap">
      <v-btn-toggle v-model="selectedSource" density="compact" variant="outlined" mandatory>
        <v-btn value="all" size="small">All</v-btn>
        <v-btn value="gsc" size="small">Google</v-btn>
        <v-btn value="bing" size="small">Bing</v-btn>
      </v-btn-toggle>

      <v-text-field
        v-model="search"
        placeholder="Filter pages..."
        density="compact"
        hide-details
        variant="outlined"
        prepend-inner-icon="mdi-magnify"
        style="max-width: 260px"
      />
    </div>

    <v-skeleton-loader v-if="loading" type="table-row@6" />

    <v-data-table
      v-else
      :headers="headers"
      :items="filteredRows"
      :items-per-page="25"
      density="compact"
      class="seo-trend-table"
    >
      <template #item.page_url="{ item }">
        <a :href="item.page_url" target="_blank" class="text-primary text-decoration-none text-body-2">
          {{ shortUrl(item.page_url) }}
        </a>
      </template>

      <template #item.impressions="{ item }">
        <span class="font-weight-medium">{{ item.impressions.toLocaleString() }}</span>
      </template>

      <template #item.clicks="{ item }">
        <span>{{ item.clicks.toLocaleString() }}</span>
      </template>

      <template #item.ctr="{ item }">
        <span :class="ctrColor(item.ctr)">
          {{ item.ctr != null ? (item.ctr * 100).toFixed(1) + '%' : '—' }}
        </span>
      </template>

      <template #item.avg_position="{ item }">
        <span :class="positionColor(item.avg_position)">
          {{ item.avg_position != null && item.avg_position > 0 ? item.avg_position.toFixed(1) : '—' }}
        </span>
      </template>

      <template #item.source="{ item }">
        <v-chip size="x-small" variant="tonal">{{ item.source.toUpperCase() }}</v-chip>
      </template>

      <template #item.snapshot_date="{ item }">
        <span class="text-caption text-medium-emphasis">{{ item.snapshot_date }}</span>
      </template>
    </v-data-table>
  </v-card>
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

const headers = [
  { title: "Page", key: "page_url", sortable: true },
  { title: "Source", key: "source", sortable: true },
  { title: "Date", key: "snapshot_date", sortable: true },
  { title: "Impressions", key: "impressions", sortable: true },
  { title: "Clicks", key: "clicks", sortable: true },
  { title: "CTR", key: "ctr", sortable: true },
  { title: "Avg Position", key: "avg_position", sortable: true },
];

const filteredRows = computed(() =>
  props.rows.filter((r) => {
    if (selectedSource.value !== "all" && r.source !== selectedSource.value) return false;
    if (search.value && !r.page_url.toLowerCase().includes(search.value.toLowerCase())) return false;
    return true;
  })
);

function shortUrl(url: string) {
  try { return new URL(url).pathname; } catch { return url; }
}

function ctrColor(ctr: number | null) {
  if (ctr == null) return "";
  if (ctr >= 0.05) return "text-success";
  if (ctr >= 0.02) return "text-warning";
  return "text-error";
}

function positionColor(pos: number | null) {
  if (pos == null || pos === 0) return "";
  if (pos <= 5) return "text-success";
  if (pos <= 15) return "text-warning";
  return "text-medium-emphasis";
}
</script>
