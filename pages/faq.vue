<template>
  <v-container fluid>
    <PageHeader
      :text="$t('pages.faq.heading')"
      :subtitle="$t('pages.faq.subtitle')"
    >
      <template #icon>
        <ClientOnly>
          <v-tooltip
            :text="$t('pages.faq.tooltip')"
            location="bottom"
            :scrim="false"
            :open-on-click="false"
          >
            <template #activator="{ props }">
              <v-icon v-bind="props" icon="mdi-help-circle-outline" />
            </template>
          </v-tooltip>
          <template #fallback>
            <v-icon icon="mdi-help-circle-outline" />
          </template>
        </ClientOnly>
      </template>
    </PageHeader>
    <AboutFaq />
  </v-container>
</template>

<script setup>
import AboutFaq from "~/components/AboutFaq.vue";

useSeoI18nMeta("faq");
</script>
