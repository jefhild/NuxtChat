<template>
  <section class="seo-brief-card">
    <div class="seo-brief-card__header">
      <div>
        <div class="seo-brief-card__kicker">Today's brief</div>
        <div class="seo-brief-card__meta">
          {{ brief ? formatDate(brief.brief_date) : "No brief yet" }}
        </div>
      </div>

      <div v-if="brief?.sources_used?.length" class="seo-brief-card__sources">
        <span
          v-for="src in brief.sources_used"
          :key="src"
          class="seo-brief-card__pill"
        >
          {{ src.toUpperCase() }}
        </span>
      </div>
    </div>

    <LoadingContainer v-if="loading" text="Loading brief..." />

    <template v-else>
      <p v-if="brief?.headline" class="seo-brief-card__headline">
        {{ brief.headline }}
      </p>

      <div class="seo-brief-card__grid">
        <section class="seo-brief-panel seo-brief-panel--success">
          <div class="seo-brief-panel__title">✅ Working well</div>
          <ul v-if="brief?.pages_working?.length" class="seo-brief-list">
            <li
              v-for="(item, i) in brief.pages_working"
              :key="i"
              class="seo-brief-list__item"
            >
              <div class="seo-brief-list__headline">
                <span class="seo-brief-list__icon" aria-hidden="true">↗</span>
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="seo-brief-list__link">
                  {{ shortUrl(item.url) }}
                </a>
              </div>
              <div class="seo-brief-list__meta">{{ item.metric }} — {{ item.reason }}</div>
            </li>
          </ul>
          <p v-else class="seo-brief-panel__empty">No data yet</p>
        </section>

        <section class="seo-brief-panel seo-brief-panel--warning">
          <div class="seo-brief-panel__title">⚠️ Optimize</div>
          <ul v-if="brief?.pages_to_optimize?.length" class="seo-brief-list">
            <li
              v-for="(item, i) in brief.pages_to_optimize"
              :key="i"
              class="seo-brief-list__item"
            >
              <div class="seo-brief-list__headline">
                <span class="seo-brief-list__icon" aria-hidden="true">!</span>
                <a :href="item.url" target="_blank" rel="noopener noreferrer" class="seo-brief-list__link">
                  {{ shortUrl(item.url) }}
                </a>
              </div>
              <div class="seo-brief-list__meta">{{ item.issue }} — {{ item.suggestion }}</div>
            </li>
          </ul>
          <p v-else class="seo-brief-panel__empty">No data yet</p>
        </section>

        <section class="seo-brief-panel seo-brief-panel--info">
          <div class="seo-brief-panel__title">💡 Create</div>
          <ul v-if="brief?.pages_to_create?.length" class="seo-brief-list">
            <li
              v-for="(item, i) in brief.pages_to_create"
              :key="i"
              class="seo-brief-list__item"
            >
              <div class="seo-brief-list__headline">
                <span class="seo-brief-list__icon" aria-hidden="true">+</span>
                <span class="seo-brief-list__slug">/{{ item.suggested_slug }}</span>
              </div>
              <div class="seo-brief-list__meta">{{ item.rationale }}</div>
              <div class="seo-brief-list__meta seo-brief-list__meta--muted">
                Queries: {{ (item.target_queries ?? []).join(", ") }}
              </div>
            </li>
          </ul>
          <p v-else class="seo-brief-panel__empty">No data yet</p>
        </section>
      </div>

      <template v-if="brief?.action_plan">
        <div class="seo-brief-card__divider" />
        <div class="seo-brief-card__action-label">📋 This week's action plan</div>
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div class="seo-brief-card__action-plan" v-html="renderMarkdown(brief.action_plan)" />
      </template>
    </template>
  </section>
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

<style scoped>
.seo-brief-card {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 20px;
  background: rgba(var(--color-surface), 0.88);
  padding: 1.25rem;
}

.seo-brief-card__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.seo-brief-card__kicker,
.seo-brief-card__action-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--color-text), 0.62);
}

.seo-brief-card__meta {
  margin-top: 0.35rem;
  color: rgba(var(--color-text), 0.68);
  font-size: 0.92rem;
}

.seo-brief-card__sources {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.seo-brief-card__pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.35rem 0.7rem;
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-primary));
  font-size: 0.78rem;
  font-weight: 700;
}

.seo-brief-card__headline {
  margin: 1rem 0 0;
  color: rgb(var(--color-text));
  font-size: 1rem;
  font-weight: 600;
}

.seo-brief-card__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}

.seo-brief-panel {
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 18px;
  background: rgba(var(--color-surface-elevated), 0.72);
  padding: 1rem;
}

.seo-brief-panel--success {
  border-color: rgba(34, 197, 94, 0.2);
}

.seo-brief-panel--warning {
  border-color: rgba(245, 158, 11, 0.22);
}

.seo-brief-panel--info {
  border-color: rgba(59, 130, 246, 0.2);
}

.seo-brief-panel__title {
  margin-bottom: 0.85rem;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.seo-brief-panel__empty,
.seo-brief-list__meta {
  color: rgba(var(--color-text), 0.72);
  font-size: 0.86rem;
}

.seo-brief-list {
  display: grid;
  gap: 0.85rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.seo-brief-list__headline {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  margin-bottom: 0.22rem;
  font-size: 0.92rem;
  font-weight: 700;
}

.seo-brief-list__icon {
  display: inline-flex;
  width: 1.15rem;
  justify-content: center;
  color: rgba(var(--color-text), 0.66);
}

.seo-brief-list__link,
.seo-brief-list__slug {
  color: rgb(var(--color-primary));
  text-decoration: none;
}

.seo-brief-list__meta--muted {
  margin-top: 0.25rem;
  color: rgba(var(--color-text), 0.58);
}

.seo-brief-card__divider {
  margin: 1.2rem 0 1rem;
  border-top: 1px solid rgba(var(--color-border), 0.72);
}

.seo-brief-card__action-plan {
  color: rgba(var(--color-text), 0.9);
  font-size: 0.92rem;
  line-height: 1.6;
}

.seo-brief-card__action-plan :deep(ul) {
  margin: 0.75rem 0 0;
  padding-left: 1.2rem;
}

@media (max-width: 1023px) {
  .seo-brief-card__grid {
    grid-template-columns: 1fr;
  }
}
</style>
