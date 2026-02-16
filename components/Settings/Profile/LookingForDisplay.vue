<template>
  <div class="d-flex align-center">
    <div v-for="icon in lookingForIcons" :key="icon.id" class="pa-1">
      <v-tooltip
        :text="icon.tooltip"
        location="top"
        :scrim="false"
        :open-on-click="false"
      >
        <template #activator="{ props: tooltipProps }">
          <v-icon size="20" :color="icon.color" v-bind="tooltipProps">
            {{ icon.icon }}
          </v-icon>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup>
import { onMounted, watch } from "vue";
import { useLookingFor } from "@/composables/useLookingFor";

const props = defineProps({
  userId: {
    type: String,
    required: true,
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
