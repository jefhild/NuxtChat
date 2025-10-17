<template>
  <v-container fluid>
    <PageHeader
      :text="$t('pages.about.heading')"
      :subtitle="$t('pages.about.subtitle')"
    />
    <About />
  </v-container>
</template>
<script setup>
useSeoI18nMeta('about');
</script>
