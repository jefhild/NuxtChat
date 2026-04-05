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
            <div class="text-body-1 font-weight-bold text-primary">
              /{{ item.suggested_slug }}
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
          <v-btn
            size="small"
            variant="tonal"
            color="primary"
            :href="`/admin?section=seoPages&create=/${item.suggested_slug}`"
            target="_blank"
            prepend-icon="mdi-plus"
          >
            Create
          </v-btn>
        </div>
      </v-card>
    </div>
  </v-card>
</template>

<script setup lang="ts">
interface PageCreate {
  suggested_slug: string;
  rationale: string;
  target_queries: string[];
}

defineProps<{ items: PageCreate[]; loading: boolean }>();
</script>
