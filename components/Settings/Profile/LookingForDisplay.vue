<template>
  <div class="looking-for-icons">
    <i
      v-for="icon in lookingForIcons"
      :key="icon.id"
      :class="['mdi', icon.icon, 'looking-for-icon']"
      :title="icon.tooltip"
      :aria-label="icon.tooltip"
      :style="{
        '--looking-for-icon-color': resolveIconColor(icon.color),
        '--looking-for-icon-size': `${Number(iconSize) || 20}px`,
      }"
    />
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
  return ICON_COLORS[normalized] || normalized || "#94a3b8";
};

const loadIcons = async (userId) => {
  if (!userId || userId === "undefined") return;
  lookingForIcons.value = await fetchUserLookingForIcons(userId);
};

onMounted(() => loadIcons(props.userId));

watch(() => props.userId, (newUserId) => loadIcons(newUserId));
</script>

<style scoped>
.looking-for-icons {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.looking-for-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: var(--looking-for-icon-size, 20px);
  color: var(--looking-for-icon-color, #94a3b8);
  background: transparent;
}
</style>
