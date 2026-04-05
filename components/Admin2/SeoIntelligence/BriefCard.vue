<template>
  <v-card class="pa-4" elevation="0">
    <!-- Header row -->
    <div class="d-flex flex-wrap align-center justify-space-between ga-4 mb-1">
      <div>
        <div class="text-overline text-medium-emphasis">Today's brief</div>
        <div class="text-body-2 text-medium-emphasis">
          {{ brief ? formatDate(brief.brief_date) : 'No brief yet' }}
          <span v-if="brief?.sources_used?.length" class="ml-2">
            <v-chip
              v-for="src in brief.sources_used"
              :key="src"
              size="x-small"
              variant="tonal"
              class="mr-1"
            >{{ src.toUpperCase() }}</v-chip>
          </span>
        </div>
      </div>
    </div>

    <!-- Headline -->
    <p v-if="brief?.headline" class="text-body-1 font-weight-medium mb-4">
      {{ brief.headline }}
    </p>
    <v-skeleton-loader v-else-if="loading" type="text" class="mb-4" />

    <v-row>
      <!-- What's working -->
      <v-col cols="12" md="4">
        <div class="text-overline text-success mb-2">✅ Working well</div>
        <v-list density="compact" class="pa-0 bg-transparent">
          <v-list-item
            v-for="(item, i) in brief?.pages_working ?? []"
            :key="i"
            class="px-0"
          >
            <template #prepend>
              <v-icon size="small" color="success" class="mr-2">mdi-trending-up</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              <a :href="item.url" target="_blank" class="text-primary text-decoration-none">
                {{ shortUrl(item.url) }}
              </a>
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ item.metric }} — {{ item.reason }}
            </v-list-item-subtitle>
          </v-list-item>
          <p v-if="!loading && !brief?.pages_working?.length" class="text-caption text-medium-emphasis">
            No data yet
          </p>
        </v-list>
      </v-col>

      <!-- Needs optimization -->
      <v-col cols="12" md="4">
        <div class="text-overline text-warning mb-2">⚠️ Optimize</div>
        <v-list density="compact" class="pa-0 bg-transparent">
          <v-list-item
            v-for="(item, i) in brief?.pages_to_optimize ?? []"
            :key="i"
            class="px-0"
          >
            <template #prepend>
              <v-icon size="small" color="warning" class="mr-2">mdi-alert-outline</v-icon>
            </template>
            <v-list-item-title class="text-body-2">
              <a :href="item.url" target="_blank" class="text-primary text-decoration-none">
                {{ shortUrl(item.url) }}
              </a>
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ item.issue }} — {{ item.suggestion }}
            </v-list-item-subtitle>
          </v-list-item>
          <p v-if="!loading && !brief?.pages_to_optimize?.length" class="text-caption text-medium-emphasis">
            No data yet
          </p>
        </v-list>
      </v-col>

      <!-- Create -->
      <v-col cols="12" md="4">
        <div class="text-overline text-info mb-2">💡 Create</div>
        <v-list density="compact" class="pa-0 bg-transparent">
          <v-list-item
            v-for="(item, i) in brief?.pages_to_create ?? []"
            :key="i"
            class="px-0"
          >
            <template #prepend>
              <v-icon size="small" color="info" class="mr-2">mdi-plus-circle-outline</v-icon>
            </template>
            <v-list-item-title class="text-body-2 font-weight-medium">
              /{{ item.suggested_slug }}
            </v-list-item-title>
            <v-list-item-subtitle class="text-caption">
              {{ item.rationale }}
            </v-list-item-subtitle>
            <v-list-item-subtitle class="text-caption text-medium-emphasis">
              Queries: {{ (item.target_queries ?? []).join(', ') }}
            </v-list-item-subtitle>
          </v-list-item>
          <p v-if="!loading && !brief?.pages_to_create?.length" class="text-caption text-medium-emphasis">
            No data yet
          </p>
        </v-list>
      </v-col>
    </v-row>

    <!-- Action plan -->
    <template v-if="brief?.action_plan">
      <v-divider class="my-4" />
      <div class="text-overline text-medium-emphasis mb-2">📋 This week's action plan</div>
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="text-body-2" v-html="renderMarkdown(brief.action_plan)" />
    </template>
  </v-card>
</template>

<script setup lang="ts">
interface PageWorking { url: string; reason: string; metric: string }
interface PageOptimize { url: string; issue: string; suggestion: string }
interface PageCreate { suggested_slug: string; rationale: string; target_queries: string[] }

interface SeoBrief {
  id: string;
  brief_date: string;
  headline: string;
  pages_working: PageWorking[];
  pages_to_optimize: PageOptimize[];
  pages_to_create: PageCreate[];
  action_plan: string;
  sources_used: string[];
}

const props = defineProps<{ brief: SeoBrief | null; loading: boolean }>();

function shortUrl(url: string) {
  try { return new URL(url).pathname; } catch { return url; }
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function renderMarkdown(text: string) {
  return text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>)/s, "<ul>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>");
}
</script>
