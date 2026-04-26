<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:px-8">
    <PageHeader
      :text="$t('pages.faq.heading')"
      :subtitle="$t('pages.faq.subtitle')"
    >
      <template #icon>
        <span class="faq-header-tooltip">
          <button
            type="button"
            class="faq-header-tooltip__trigger"
            :aria-label="$t('pages.faq.tooltip')"
          >
            <i class="mdi mdi-help-circle-outline" aria-hidden="true" />
          </button>
          <span class="faq-header-tooltip__bubble" role="tooltip">
            {{ $t("pages.faq.tooltip") }}
          </span>
        </span>
      </template>
    </PageHeader>
    <AboutFaq />
  </div>
</template>

<script setup>
import AboutFaq from "~/components/AboutFaq.vue";

useSeoI18nMeta("faq");

const { locale } = useI18n();

const { data: faqResponse } = await useFetch("/api/faqs", {
  query: computed(() => ({ locale: locale.value })),
  default: () => ({ success: true, data: { groups: [], entries: [] } }),
});

const faqEntries = computed(() => faqResponse.value?.data?.entries || []);

useHead(() => {
  if (!faqEntries.value.length) return {};
  return {
    script: [
      {
        type: "application/ld+json",
        key: "faq-schema",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqEntries.value.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }),
      },
    ],
  };
});
</script>

<style scoped>
.faq-header-tooltip {
  position: relative;
  display: inline-flex;
  align-items: center;
}

.faq-header-tooltip__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
  font-size: 1.2rem;
  cursor: default;
}

.faq-header-tooltip__bubble {
  position: absolute;
  top: calc(100% + 0.55rem);
  left: 50%;
  z-index: 10;
  width: max-content;
  max-width: min(18rem, 70vw);
  padding: 0.55rem 0.7rem;
  border-radius: 0.75rem;
  background: rgb(var(--color-foreground) / 0.94);
  color: rgb(var(--color-background));
  font-size: 0.8rem;
  line-height: 1.4;
  text-align: center;
  box-shadow: 0 12px 24px rgb(var(--color-shadow) / 0.18);
  transform: translateX(-50%) translateY(-4px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease;
}

.faq-header-tooltip:hover .faq-header-tooltip__bubble,
.faq-header-tooltip:focus-within .faq-header-tooltip__bubble {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
</style>
