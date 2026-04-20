<template>
  <SeoLandingPage
    v-if="page"
    :page="page"
    :section-label="page.sectionLabel"
    :available-locales="availableLocales"
    :current-locale="locale"
  />
</template>

<script setup lang="ts">
const { locale, page, availableLocales } = await useLandingSeoPage("practice-french-chat-online");
</script>
