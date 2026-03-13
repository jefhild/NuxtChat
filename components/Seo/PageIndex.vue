<template>
  <v-container
    fluid
    :class="['seo-index-shell', { 'seo-index-shell--dark': isDarkTheme }]"
  >
    <div class="seo-index-header">
      <v-chip size="small" variant="tonal" color="primary" class="mb-3">
        {{ kicker }}
      </v-chip>
      <h1 class="text-h4 font-weight-bold mb-2">{{ title }}</h1>
      <p class="text-body-1 text-medium-emphasis mb-0">{{ description }}</p>
    </div>

    <v-row>
      <v-col v-for="page in pages" :key="`${page.locale}-${page.slug}`" cols="12" md="6">
        <v-card
          :class="['pa-5 h-100', { 'seo-index-card--dark': isDarkTheme }]"
          rounded="xl"
          elevation="0"
        >
          <div class="text-overline mb-2">{{ page.locale.toUpperCase() }}</div>
          <div class="text-h6 font-weight-bold mb-2">{{ page.title }}</div>
          <p class="text-body-2 text-medium-emphasis mb-4">
            {{ page.subtitle || page.metaDescription || page.heroBody || "Explore this page." }}
          </p>
          <v-btn color="primary" variant="outlined" :to="localPath(page.path)">
            Open page
          </v-btn>
        </v-card>
      </v-col>

      <v-col v-if="!pages.length" cols="12">
        <v-alert type="info" variant="tonal">
          No published pages yet for this section.
        </v-alert>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { useTheme } from "vuetify";

type SeoIndexPage = {
  locale: string;
  slug: string;
  path: string;
  title: string;
  subtitle?: string;
  metaDescription?: string;
  heroBody?: string;
};

defineProps<{
  title: string;
  description: string;
  kicker: string;
  pages: SeoIndexPage[];
}>();

const localPath = useLocalePath();
const theme = useTheme();
const isDarkTheme = computed(() => theme.global.current.value.dark);
</script>

<style scoped>
.seo-index-shell {
  padding: 12px 10px 32px;
}

.seo-index-shell--dark {
  color: #e2e8f0;
}

.seo-index-header {
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.97), rgba(244, 247, 251, 0.94));
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 28px;
  padding: 28px;
  margin-bottom: 20px;
}

.seo-index-shell--dark .seo-index-header,
.seo-index-card--dark {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border: 1px solid rgba(148, 163, 184, 0.18);
  color: #e2e8f0;
}

.seo-index-shell--dark :deep(.text-medium-emphasis),
.seo-index-shell--dark :deep(.text-body-2),
.seo-index-shell--dark :deep(.text-body-1) {
  color: #cbd5e1 !important;
}
</style>
