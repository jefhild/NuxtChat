<template>
  <v-row justify="center">
    <v-col
      v-for="icon in descriptionIcons"
      :key="icon.id"
      cols="auto"
      class="pa-1 mt-3"
    >
      <v-icon size="large" :color="icon.color" v-tooltip="icon.tooltip">{{
        icon.icon
      }}</v-icon>
    </v-col>
  </v-row>
</template>

<script setup lang="ts">
const props = defineProps<{
  descriptionIcons: {
    id: number;
    icon: string;
    tooltip: string;
    color: string;
  }[];
}>();
</script>
