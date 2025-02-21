<template>
  <v-btn icon="mdi-account" to="/profile"></v-btn>

  {{ display_name }}
</template>

<script setup>
const props = defineProps({
  display_name: {
    type: String,
    required: true,
  },
});
</script>
