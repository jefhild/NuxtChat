<template>
  <div class="mood-chips-bar">
    <button
      v-for="preset in MOOD_PRESETS"
      :key="preset.key"
      type="button"
      class="mood-chip"
      :class="{ 'mood-chip--active': selectedKey === preset.key }"
      @click="onChipClick(preset)"
    >
      <i :class="['mdi', preset.icon, 'mood-chip__icon']" aria-hidden="true" />
      <span>{{ $t(preset.labelKey) }}</span>
    </button>
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
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  min-height: 44px;
  padding: 0.7rem 1.1rem;
  border: 1px solid rgb(var(--color-border) / 0.78);
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.88);
  font-size: 0.95rem;
  font-weight: 500;
  line-height: 1.2;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease, background-color 0.15s ease, color 0.15s ease;
}

.mood-chip:hover,
.mood-chip:focus-visible {
  transform: translateY(-1px);
  border-color: rgb(var(--color-primary) / 0.4);
  outline: none;
}

.mood-chip--active {
  background: rgb(var(--color-primary) / 0.12);
  border-color: rgb(var(--color-primary) / 0.45);
  color: rgb(var(--color-primary));
}

.mood-chip__icon {
  font-size: 1.05rem;
}
</style>
