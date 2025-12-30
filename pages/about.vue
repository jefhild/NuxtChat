<template>
  <v-container fluid>
    <PageHeader
      :text="$t('pages.about.heading')"
      :subtitle="$t('pages.about.subtitle')"
    />
    <v-tabs v-model="tab" color="primary">
      <v-tab :value="1">
        {{ $t("pages.about.tabs.humans") }}
      </v-tab>
      <v-tab :value="2">
        {{ $t("pages.about.tabs.newsroom") }}
      </v-tab>
    </v-tabs>
    <v-tabs-window v-model="tab">
      <v-tabs-window-item :value="1">
        <About />
      </v-tabs-window-item>
      <v-tabs-window-item :value="2">
        <AiProfiles />
      </v-tabs-window-item>
    </v-tabs-window>
  </v-container>
</template>
<script setup>
const tab = ref(1);

useSeoI18nMeta('about');
</script>
