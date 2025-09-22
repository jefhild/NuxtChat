<template>
  <v-row justify="end">
    <v-col
      v-for="icon in lookingForIcons"
      :key="icon.id"
      cols="auto"
      class="pa-1 mt-3"
    >
      <v-icon size="large" :color="icon.color" v-tooltip="icon.tooltip">
        {{ icon.icon }}
      </v-icon>
    </v-col>
  </v-row>
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