<template>
  <section class="seo-suggestions">
    <div class="seo-suggestions__kicker">💡 Suggested pages to create</div>
    <p class="seo-suggestions__subtitle">
      These are AI-recommended slugs based on search queries you're appearing for but don't have a dedicated page for yet.
    </p>

    <LoadingContainer v-if="loading" text="Loading suggestions..." />

    <div
      v-else-if="!items.length"
      class="seo-suggestions__banner"
      role="status"
    >
      No suggestions yet — run a snapshot to generate recommendations.
    </div>

    <div v-else class="seo-suggestions__list">
      <article
        v-for="(item, i) in items"
        :key="i"
        class="seo-suggestions__item"
      >
        <div class="seo-suggestions__item-main">
          <div class="seo-suggestions__item-header">
            <span class="seo-suggestions__slug">/{{ item.suggested_slug }}</span>
            <span
              v-if="item.page_type"
              class="seo-suggestions__pill"
              :class="pageTypeClass(item.page_type)"
            >
              {{ item.page_type }}
            </span>
          </div>
          <p class="seo-suggestions__rationale">{{ item.rationale }}</p>
          <div class="seo-suggestions__query-list">
            <span
              v-for="q in item.target_queries"
              :key="q"
              class="seo-suggestions__query-pill"
            >
              {{ q }}
            </span>
          </div>
        </div>

        <div class="seo-suggestions__item-actions">
          <template v-if="pageStatus(item.suggested_slug)">
            <span
              class="seo-suggestions__pill"
              :class="pageStatus(item.suggested_slug)!.isPublished ? 'seo-suggestions__pill--success' : 'seo-suggestions__pill--warning'"
            >
              {{ pageStatus(item.suggested_slug)!.isPublished ? "Live" : "Draft" }}
            </span>
            <button
              type="button"
              class="seo-suggestions__button seo-suggestions__button--link"
              @click="router.push({ query: { section: 'seoPages' } })"
            >
              Edit
            </button>
          </template>

          <button
            v-else
            type="button"
            class="seo-suggestions__button seo-suggestions__button--primary"
            :disabled="creating !== null"
            @click="createDraft(item, i)"
          >
            <span v-if="creating === i" class="seo-suggestions__spinner" aria-hidden="true" />
            {{ creating === i ? "Generating…" : "Create" }}
          </button>
        </div>
      </article>
    </div>
  </section>

  <Teleport to="body">
    <div class="seo-suggestions__toast-stack" aria-live="polite" aria-atomic="true">
      <Transition name="seo-suggestions-toast-fade">
        <div
          v-if="snackbar.show"
          class="seo-suggestions__toast"
          :class="`seo-suggestions__toast--${snackbar.color}`"
          role="status"
        >
          <span>{{ snackbar.message }}</span>
          <button
            v-if="snackbar.color === 'warning'"
            type="button"
            class="seo-suggestions__toast-action"
            @click="snackbar.show = false"
          >
            Got it
          </button>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
interface PageCreate {
  suggested_slug: string;
  page_type?: "landing" | "guide" | "topic" | "compare";
  rationale: string;
  target_queries: string[];
}

interface ExistingPageEntry { isPublished: boolean; path: string }

const props = defineProps<{
  items: PageCreate[];
  loading: boolean;
  existingPageMap?: Map<string, ExistingPageEntry>;
}>();

const emit = defineEmits<{ created: [] }>();

const router = useRouter();

const creating = ref<number | null>(null);
const snackbar = ref({ show: false, color: "success", message: "", timeout: 5000 });
let snackbarTimer: ReturnType<typeof setTimeout> | null = null;

const pageStatus = (slug: string) => props.existingPageMap?.get(slug) ?? null;

const pageTypeClass = (type: string) => {
  if (type === "guide") return "seo-suggestions__pill--guide";
  if (type === "topic") return "seo-suggestions__pill--topic";
  if (type === "compare") return "seo-suggestions__pill--compare";
  return "seo-suggestions__pill--landing";
};

const slugToTitle = (slug: string) =>
  slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

async function createDraft(item: PageCreate, index: number) {
  creating.value = index;
  try {
    const pageType = item.page_type ?? "landing";

    // Step 1: generate full content via AI
    const { page: generated } = await $fetch<{ success: boolean; page: Record<string, unknown> }>(
      "/api/admin/seo-pages/generate",
      {
        method: "POST",
        body: {
          slug: item.suggested_slug,
          pageType,
          rationale: item.rationale,
          targetQueries: item.target_queries,
        },
      }
    );

    // Step 2: save the generated content as a draft
    await $fetch("/api/admin/seo-pages/save", {
      method: "POST",
      body: {
        ...generated,
        pageType,
        locale: "en",
        slug: item.suggested_slug,
        title: generated.title || slugToTitle(item.suggested_slug),
        isPublished: false,
      },
    });

    emit("created");

    if (pageType === "landing") {
      snackbar.value = {
        show: true,
        color: "warning",
        timeout: 12000,
        message: `Draft saved. Before publishing, add "/${item.suggested_slug}" (and locale variants) to redirectOptions.exclude in nuxt.config.ts and redeploy.`,
      };
    } else {
      snackbar.value = {
        show: true,
        color: "success",
        timeout: 3000,
        message: `Draft created — opening SEO Pages editor…`,
      };
    }

    await new Promise((r) => setTimeout(r, 1400));
    router.push({ query: { section: "seoPages" } });
  } catch (e: unknown) {
    snackbar.value = {
      show: true,
      color: "error",
      timeout: 5000,
      message: (e as { data?: { error?: string }; message?: string })?.data?.error ?? "Failed to create draft.",
    };
  } finally {
    creating.value = null;
  }
}

watch(
  () => snackbar.value.show,
  (visible) => {
    if (snackbarTimer) {
      clearTimeout(snackbarTimer);
      snackbarTimer = null;
    }

    if (!visible) return;

    snackbarTimer = setTimeout(() => {
      snackbar.value.show = false;
      snackbarTimer = null;
    }, snackbar.value.timeout);
  }
);

onBeforeUnmount(() => {
  if (snackbarTimer) clearTimeout(snackbarTimer);
});
</script>

<style scoped>
.seo-suggestions__kicker {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(var(--color-text), 0.62);
}

.seo-suggestions__subtitle {
  margin: 0.45rem 0 0;
  color: rgba(var(--color-text), 0.68);
  font-size: 0.88rem;
}

.seo-suggestions__banner {
  margin-top: 1rem;
  border: 1px solid rgba(var(--color-primary), 0.25);
  border-radius: 16px;
  padding: 0.85rem 1rem;
  background: rgba(var(--color-primary), 0.1);
  color: rgba(var(--color-text), 0.88);
}

.seo-suggestions__list {
  display: grid;
  gap: 0.9rem;
  margin-top: 1rem;
}

.seo-suggestions__item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid rgba(var(--color-border), 0.82);
  border-radius: 18px;
  background: rgba(var(--color-surface), 0.88);
  padding: 1rem;
}

.seo-suggestions__item-main {
  min-width: 0;
  flex: 1;
}

.seo-suggestions__item-header,
.seo-suggestions__query-list,
.seo-suggestions__item-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.seo-suggestions__item-actions {
  align-items: flex-end;
  flex-direction: column;
}

.seo-suggestions__slug {
  color: rgb(var(--color-primary));
  font-size: 1rem;
  font-weight: 700;
}

.seo-suggestions__rationale {
  margin: 0.45rem 0;
  color: rgba(var(--color-text), 0.86);
  font-size: 0.92rem;
}

.seo-suggestions__pill,
.seo-suggestions__query-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.seo-suggestions__pill {
  padding: 0.35rem 0.7rem;
  background: rgba(var(--color-text), 0.06);
  color: rgba(var(--color-text), 0.82);
}

.seo-suggestions__pill--landing {
  background: rgba(var(--color-primary), 0.1);
  color: rgb(var(--color-primary));
}

.seo-suggestions__pill--guide {
  background: rgba(20, 184, 166, 0.14);
  color: #0f766e;
}

.seo-suggestions__pill--topic {
  background: rgba(147, 51, 234, 0.14);
  color: #7e22ce;
}

.seo-suggestions__pill--compare {
  background: rgba(249, 115, 22, 0.14);
  color: #c2410c;
}

.seo-suggestions__pill--success {
  background: rgba(34, 197, 94, 0.14);
  color: #166534;
}

.seo-suggestions__pill--warning {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

.seo-suggestions__query-pill {
  padding: 0.35rem 0.65rem;
  background: rgba(var(--color-primary), 0.08);
  color: rgba(var(--color-text), 0.84);
}

.seo-suggestions__button,
.seo-suggestions__toast-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border-radius: 14px;
  border: 1px solid rgba(var(--color-border), 0.88);
  background: rgba(var(--color-surface), 0.98);
  color: rgb(var(--color-text));
  font-weight: 600;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.seo-suggestions__button {
  min-height: 2.5rem;
  padding: 0.65rem 0.95rem;
}

.seo-suggestions__button:hover,
.seo-suggestions__toast-action:hover {
  transform: translateY(-1px);
  border-color: rgba(var(--color-primary), 0.45);
}

.seo-suggestions__button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.seo-suggestions__button--primary {
  border-color: rgba(var(--color-primary), 0.42);
  background: rgba(var(--color-primary), 0.14);
  color: rgb(var(--color-primary));
}

.seo-suggestions__button--link {
  min-height: auto;
  border: 0;
  background: transparent;
  color: rgb(var(--color-primary));
  padding: 0;
}

.seo-suggestions__spinner {
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 999px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  animation: seo-suggestions-spin 0.8s linear infinite;
}

.seo-suggestions__toast-stack {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2600;
  display: flex;
  justify-content: flex-end;
  pointer-events: none;
}

.seo-suggestions__toast {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  max-width: min(420px, calc(100vw - 32px));
  border-radius: 18px;
  border: 1px solid rgba(var(--color-border), 0.88);
  padding: 0.95rem 1rem;
  box-shadow: 0 18px 38px rgba(15, 23, 42, 0.16);
  pointer-events: auto;
}

.seo-suggestions__toast--success {
  background: rgb(var(--color-surface));
  color: rgb(var(--color-text));
}

.seo-suggestions__toast--warning {
  background: #fff7ed;
  border-color: rgba(245, 158, 11, 0.24);
  color: #9a3412;
}

.seo-suggestions__toast--error {
  background: #fef2f2;
  border-color: rgba(220, 38, 38, 0.22);
  color: #b91c1c;
}

.seo-suggestions__toast-action {
  min-height: 2rem;
  padding: 0.45rem 0.75rem;
  background: transparent;
}

.seo-suggestions-toast-fade-enter-active,
.seo-suggestions-toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.seo-suggestions-toast-fade-enter-from,
.seo-suggestions-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

@keyframes seo-suggestions-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 767px) {
  .seo-suggestions__item {
    flex-direction: column;
  }

  .seo-suggestions__item-actions {
    width: 100%;
    align-items: flex-start;
  }

  .seo-suggestions__toast-stack {
    right: 12px;
    left: 12px;
    bottom: 12px;
  }

  .seo-suggestions__toast {
    max-width: 100%;
  }
}
</style>
