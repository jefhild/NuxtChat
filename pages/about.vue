<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
    <PageHeader
      :text="$t('pages.about.heading')"
      :subtitle="$t('pages.about.subtitle')"
    />

    <div
      class="about-tabs"
      role="tablist"
      aria-label="About sections"
    >
      <button
        v-for="item in tabs"
        :id="`about-tab-${item.value}`"
        :key="item.value"
        type="button"
        role="tab"
        class="about-tabs__button"
        :class="{ 'about-tabs__button--active': tab === item.value }"
        :aria-selected="tab === item.value ? 'true' : 'false'"
        :aria-controls="`about-panel-${item.value}`"
        @click="tab = item.value"
      >
        {{ item.label }}
      </button>
    </div>

    <div
      :id="`about-panel-${tab}`"
      class="about-panel"
      role="tabpanel"
      :aria-labelledby="`about-tab-${tab}`"
    >
      <KeepAlive>
        <component :is="activePanel" />
      </KeepAlive>
    </div>
  </div>
</template>
<script setup>
import About from "~/components/About.vue";
import AiProfiles from "~/components/AiProfiles.vue";
import AboutFaq from "~/components/AboutFaq.vue";

const tab = ref("humans");
const route = useRoute();
const { t } = useI18n();

const tabs = computed(() => [
  {
    value: "humans",
    label: t("pages.about.tabs.humans"),
  },
  {
    value: "newsroom",
    label: t("pages.about.tabs.newsroom"),
  },
  {
    value: "faq",
    label: t("pages.about.tabs.faq"),
  },
]);

const activePanel = computed(() => {
  if (tab.value === "newsroom") return AiProfiles;
  if (tab.value === "faq") return AboutFaq;
  return About;
});

useSeoI18nMeta('about');

useHead(() => ({
  script: [{
    key: 'ld-about-page',
    type: 'application/ld+json',
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": t('pages.about.meta.title'),
      "description": t('pages.about.meta.description'),
      "url": "https://imchatty.com/about",
      "isPartOf": { "@id": "https://imchatty.com/#website" },
      "publisher": { "@id": "https://imchatty.com/#organization" },
    }),
  }],
}));

watch(
  () => route.hash,
  (hash) => {
    if (hash) {
      tab.value = "faq";
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.about-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.5rem;
}

.about-tabs__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0.7rem 1rem;
  border: 1px solid rgb(var(--color-border) / 0.78);
  border-radius: 999px;
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground) / 0.8);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.2;
  cursor: pointer;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.about-tabs__button:hover,
.about-tabs__button:focus-visible {
  border-color: rgb(var(--color-primary) / 0.35);
  color: rgb(var(--color-foreground));
  box-shadow: 0 10px 24px rgb(var(--color-shadow) / 0.08);
  outline: none;
}

.about-tabs__button--active {
  border-color: rgb(var(--color-primary) / 0.4);
  background: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
}

.about-panel {
  margin-top: 0.75rem;
}
</style>
