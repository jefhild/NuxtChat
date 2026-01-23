<template>
  <v-card variant="outlined">
    <v-card-title class="d-flex flex-wrap align-center justify-space-between">
      <span>{{ t("components.photo-library.title") }}</span>
      <div class="d-flex ga-2">
        <v-btn size="small" variant="outlined" disabled>
          {{ t("components.photo-library.add") }}
        </v-btn>
        <v-btn size="small" variant="outlined" disabled>
          {{ t("components.photo-library.delete") }}
        </v-btn>
      </div>
    </v-card-title>
    <v-card-text>
      <v-row dense>
        <v-col v-for="n in 12" :key="n" cols="6" sm="4" md="3">
          <v-skeleton-loader type="image" class="photo-library-skeleton" />
        </v-col>
      </v-row>
      <p class="text-caption text-medium-emphasis mt-3">
        {{ t("components.photo-library.placeholder") }}
      </p>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style scoped>
.photo-library-skeleton {
  width: 100%;
  aspect-ratio: 4 / 3;
  border-radius: 10px;
}
</style>
