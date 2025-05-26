<template>
  <v-row v-if="isLoading" justify="center" no-gutters>
    <v-col class="text-center">
      <v-progress-circular indeterminate color="primary" size="64" />
    </v-col>
  </v-row>

  <HomeRecent :limit="4" @loaded="handleLoaded" />
  <HomeMale :limit="4" @loaded="handleLoaded" />
  <HomeFemale :limit="4" @loaded="handleLoaded" />
  <HomeMostPopular :limit="8" @loaded="handleLoaded" />
</template>

<script setup>
const totalComponents = 4; // or count the ones in use
const loadedCount = ref(0);
const isLoading = computed(() => loadedCount.value < totalComponents);

const handleLoaded = () =>
{
  loadedCount.value++;
};
</script>