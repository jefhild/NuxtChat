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
        <v-icon :size="iconSize" :color="icon.color" v-bind="tooltipProps">
          {{ icon.icon }}
        </v-icon>
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

const loadIcons = async (userId) => {
  if (!userId || userId === "undefined") return;
  lookingForIcons.value = await fetchUserLookingForIcons(userId);
};

onMounted(() => loadIcons(props.userId));

watch(() => props.userId, (newUserId) => loadIcons(newUserId));
</script>
