<script setup>
const props = defineProps({
  score: { type: Number, default: 0 },
  myVote: { type: Number, default: 0 },
  disabled: { type: Boolean, default: true }, // keep disabled by default
})
// no emits yet; this is a placeholder
</script>

<template>
  <div class="d-flex align-center ga-1 text-disabled">
    <v-btn icon variant="text" density="comfortable" :disabled="true">
      <v-icon size="18">mdi-arrow-up-bold</v-icon>
    </v-btn>
    <span class="text-caption">{{ props.score }}</span>
    <v-btn icon variant="text" density="comfortable" :disabled="true">
      <v-icon size="18">mdi-arrow-down-bold</v-icon>
    </v-btn>
  </div>
</template>