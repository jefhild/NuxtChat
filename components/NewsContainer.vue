<template>
  <LoadingContainer v-if="isLoading" :text="$t('components.settings-container.loading')" />

  <HomeRecent :limit="4" @loaded="handleLoaded" />
  <HomeMale :limit="4" @loaded="handleLoaded" />
  <HomeFemale :limit="4" @loaded="handleLoaded" />
  <HomeMostPopular :limit="8" @loaded="handleLoaded" />
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const totalComponents = 4; // or count the ones in use
const loadedCount = ref(0);
const isLoading = computed(() => loadedCount.value < totalComponents);

const handleLoaded = () =>
{
  loadedCount.value++;
};
</script>