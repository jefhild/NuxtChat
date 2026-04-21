<template>
  <div class="d-flex align-center" style="gap: 6px;">
    <v-tooltip
      v-for="icon in lookingForIcons"
      :key="icon.id"
      :text="icon.tooltip"
      location="top"
      :scrim="false"
      :open-on-click="false"
    >
      <template #activator="{ props: tooltipProps }">
        <v-icon
          v-bind="tooltipProps"
          :icon="icon.icon"
          :size="iconSize"
          class="looking-for-icon"
          :style="{ '--looking-for-icon-color': resolveIconColor(icon.color) }"
        />
      </template>
    </v-tooltip>
  </div>
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useLookingFor } from "@/composables/useLookingFor";

const props = defineProps({
  userId: {
    type: [String, Number],
    required: true,
  },
  iconSize: {
    type: [String, Number],
    default: 20,
  },
});

const { lookingForIcons, fetchUserLookingForIcons } = useLookingFor();

const ICON_COLORS = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  pink: "#ec4899",
  orange: "#f97316",
  purple: "#a855f7",
  "deep-purple": "#7e22ce",
  "blue-lighten-1": "#38bdf8",
};

const resolveIconColor = (color) => {
  const normalized = String(color || "").trim().toLowerCase();
  return ICON_COLORS[normalized] || normalized || "rgba(var(--v-theme-on-surface), 0.72)";
};

const loadIcons = async (userId) => {
  if (!userId || userId === "undefined") return;
  lookingForIcons.value = await fetchUserLookingForIcons(userId);
};

onMounted(() => loadIcons(props.userId));

watch(() => props.userId, (newUserId) => loadIcons(newUserId));
</script>

<style scoped>
.looking-for-icon {
  color: var(--looking-for-icon-color, rgba(var(--v-theme-on-surface), 0.72)) !important;
  background: transparent !important;
}
</style>
