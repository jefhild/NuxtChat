<template>
  <v-container fluid>
    <PageHeader
      :text="$t('pages.about.heading')"
      :subtitle="$t('pages.about.subtitle')"
    />
    <AiProfiles />
    <About />
  </v-container>
</template>
<script setup>
import Ai from '~/components/Home/Ai.vue';

useSeoI18nMeta('about');
</script>
