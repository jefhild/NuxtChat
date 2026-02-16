<template>
  <v-row justify="center" align="center" class="mb-2">
    <v-col cols="12" class="text-center">
      <div class="page-header-row">
        <div v-if="$slots.start" class="page-header-action page-header-action--start">
          <slot name="start" />
        </div>
        <div class="page-header-center">
          <div class="page-header-title">
            <span v-if="$slots.icon" class="page-header-icon">
              <slot name="icon" />
            </span>
            <h1 class="text-h6 text-sm-h5 text-md-h4 text-lg-h4 page-header-text">
              {{ text }}
            </h1>
          </div>
        </div>
        <div v-if="$slots.end" class="page-header-action page-header-action--end">
          <slot name="end" />
        </div>
      </div>
      <h2
        v-if="subtitle"
        class="d-none d-md-block text-subtitle-1 text-md-h6 page-header-subtitle"
      >
        {{ subtitle }}
      </h2>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: "",
  },
});
</script>

<style scoped>
.page-header-title {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

.page-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-header-center {
  flex: 1;
  display: flex;
  justify-content: center;
}

.page-header-action {
  display: flex;
  align-items: center;
  min-width: 32px;
}

.page-header-action--start {
  justify-content: flex-start;
}

.page-header-action--end {
  justify-content: flex-end;
}

.page-header-icon :deep(.v-icon) {
  color: #3f51b5;
}

.page-header-text {
  font-family: "Poppins", sans-serif;
  /* font-size: 1.2rem;*/
  font-weight: 600;
  color: rgb(var(--v-theme-on-surface));
  /* margin-bottom: 0.25rem; */
}

.page-header-subtitle {
  color: rgba(var(--v-theme-on-surface), 0.72);
  /* font-size: 1rem;*/
  font-weight: 400;
  margin-top: 0;
}
</style>
