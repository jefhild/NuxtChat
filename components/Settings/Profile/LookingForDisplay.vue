<template>
  <div class="d-flex align-center">
    <div v-for="icon in lookingForIcons" :key="icon.id" class="pa-1">
      <v-icon size="20" :color="icon.color" v-tooltip="icon.tooltip">
        {{ icon.icon }}
      </v-icon>
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
