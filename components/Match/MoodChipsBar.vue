<template>
  <div class="mood-chips-bar">
    <v-chip
      v-for="preset in MOOD_PRESETS"
      :key="preset.key"
      :color="selectedKey === preset.key ? 'primary' : undefined"
      :variant="selectedKey === preset.key ? 'tonal' : 'outlined'"
      class="mood-chip"
      size="large"
      @click="onChipClick(preset)"
    >
      <v-icon start :icon="preset.icon" />
      {{ $t(preset.labelKey) }}
    </v-chip>
  </div>
</template>

<script setup>
import { MOOD_PRESETS } from "~/constants/moodPresets";

defineProps({
  selectedKey: {
    type: String,
    default: null,
  },
});

const emit = defineEmits(["select"]);

function onChipClick(preset) {
  emit("select", preset);
}
</script>

<style scoped>
.mood-chips-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
}

.mood-chip {
  cursor: pointer;
  transition: transform 0.15s ease;
}

.mood-chip:hover {
  transform: translateY(-1px);
}
</style>
