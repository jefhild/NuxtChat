<template>
  <v-card elevation="0" class="pa-0">
    <div class="text-overline text-medium-emphasis mb-2">💡 Suggested pages to create</div>
    <p class="text-caption text-medium-emphasis mb-4">
      These are AI-recommended slugs based on search queries you're appearing for but don't have a dedicated page for yet.
    </p>

    <v-skeleton-loader v-if="loading" type="list-item-three-line@4" />

    <v-alert v-else-if="!items.length" type="info" variant="tonal" density="compact">
      No suggestions yet — run a snapshot to generate recommendations.
    </v-alert>

    <div v-else class="suggestion-list">
      <v-card
        v-for="(item, i) in items"
        :key="i"
        variant="tonal"
        class="mb-3 pa-3"
      >
        <div class="d-flex align-start justify-space-between ga-2">
          <div>
            <div class="d-flex align-center ga-2 flex-wrap">
              <span class="text-body-1 font-weight-bold text-primary">
                /{{ item.suggested_slug }}
              </span>
              <v-chip
                v-if="item.page_type"
                size="x-small"
                variant="tonal"
                :color="pageTypeColor(item.page_type)"
              >
                {{ item.page_type }}
              </v-chip>
            </div>
            <p class="text-body-2 mt-1 mb-1">{{ item.rationale }}</p>
            <div class="d-flex flex-wrap ga-1 mt-1">
              <v-chip
                v-for="q in item.target_queries"
                :key="q"
                size="x-small"
                variant="outlined"
                color="secondary"
              >
                {{ q }}
              </v-chip>
            </div>
          </div>
          <div class="d-flex flex-column align-end ga-2">
            <!-- Already exists in DB -->
            <template v-if="pageStatus(item.suggested_slug)">
              <v-chip
                :color="pageStatus(item.suggested_slug)!.isPublished ? 'success' : 'warning'"
                size="small"
                variant="tonal"
                :prepend-icon="pageStatus(item.suggested_slug)!.isPublished ? 'mdi-check-circle' : 'mdi-pencil-outline'"
              >
                {{ pageStatus(item.suggested_slug)!.isPublished ? 'Live' : 'Draft' }}
              </v-chip>
              <v-btn
                size="x-small"
                variant="text"
                color="primary"
                @click="router.push({ query: { section: 'seoPages' } })"
              >
                Edit
              </v-btn>
            </template>
            <!-- Not yet created -->
            <v-btn
              v-else
              size="small"
              variant="tonal"
              color="primary"
              :loading="creating === i"
              :disabled="creating !== null"
              prepend-icon="mdi-plus"
              @click="createDraft(item, i)"
            >
              {{ creating === i ? 'Generating…' : 'Create' }}
            </v-btn>
          </div>
        </div>
      </v-card>
    </div>

    <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="snackbar.timeout" location="bottom">
      {{ snackbar.message }}
      <template v-if="snackbar.color === 'warning'" #actions>
        <v-btn variant="text" size="small" @click="snackbar.show = false">Got it</v-btn>
      </template>
    </v-snackbar>
  </v-card>
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
const created = ref<Set<number>>(new Set());

const snackbar = ref({ show: false, color: "success", message: "", timeout: 5000 });

const pageStatus = (slug: string) => props.existingPageMap?.get(slug) ?? null;

const pageTypeColor = (type: string) => {
  if (type === "guide") return "teal";
  if (type === "topic") return "purple";
  if (type === "compare") return "orange";
  return "primary";
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

    created.value = new Set([...created.value, index]);
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
</script>

