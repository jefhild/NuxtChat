<template>
  <v-row justify="center" align="center" class="mb-4">
    <v-col cols="12" class="text-center">
      <h1 class="page-header-text">{{ text }}</h1>
      <h2 v-if="subtitle" class="page-header-subtitle">{{ subtitle }}</h2>
    </v-col>
  </v-row>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
    default: '',
  },
})
</script>

<style scoped>
.page-header-text {
  font-family: "Poppins", sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.page-header-subtitle {
  color: #666;
  font-size: 1rem;
  font-weight: 400;
  margin-top: 0;
}
</style>