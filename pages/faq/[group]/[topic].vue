<template>
  <div class="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
    <nav class="faq-topic-breadcrumbs mb-2" aria-label="Breadcrumb">
      <ol class="faq-topic-breadcrumbs__list">
        <li
          v-for="(crumb, index) in breadcrumbs"
          :key="`${crumb.title}-${index}`"
          class="faq-topic-breadcrumbs__item"
        >
          <NuxtLink
            v-if="crumb.to && !crumb.disabled"
            :to="crumb.to"
            class="faq-topic-breadcrumbs__link"
          >
            {{ crumb.title }}
          </NuxtLink>
          <span v-else class="faq-topic-breadcrumbs__current">{{ crumb.title }}</span>
          <i
            v-if="index < breadcrumbs.length - 1"
            class="mdi mdi-chevron-right faq-topic-breadcrumbs__divider"
            aria-hidden="true"
          />
        </li>
      </ol>
    </nav>

    <PageHeader
      :text="topicTitle"
      :subtitle="$t('pages.faq.topic.subtitle', { group: groupTitle })"
    >
      <template #icon>
        <i class="mdi mdi-help-circle-outline text-primary" aria-hidden="true" />
      </template>
    </PageHeader>

    <div class="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-12">
      <aside class="lg:col-span-4">
        <div class="faq-topic-nav-card p-3">
          <div class="faq-topic-nav-card__header">
            <div class="faq-section-title">
              {{ $t("pages.about.faq.tree-title") }}
            </div>
            <span class="faq-topic-count">
              {{ entries.length }} {{ $t("pages.about.faq.results") }}
            </span>
          </div>

          <div class="faq-topic-nav-list">
            <NuxtLink
              v-for="item in relatedTopics"
              :key="item.id"
              :to="localePath(buildFaqTopicPath(item.groupSlug || topicGroupSlug, item.slug))"
              class="faq-topic-nav-link"
              :class="{ 'faq-topic-nav-link--active': item.current }"
            >
              <span>{{ item.title }}</span>
              <span class="faq-topic-nav-link__count">{{ item.entryCount }}</span>
            </NuxtLink>
          </div>
        </div>
      </aside>

      <div class="lg:col-span-8">
        <div class="faq-topic-card p-3 md:p-4">
          <div v-if="pending" class="faq-topic-skeleton" aria-hidden="true">
            <span v-for="index in 4" :key="index" class="faq-topic-skeleton__row" />
          </div>
          <div
            v-else-if="!entries.length"
            class="p-4 text-sm text-foreground/70"
          >
            {{ $t("pages.faq.topic.empty") }}
          </div>
          <div
            v-else
            class="faq-topic-panels"
          >
            <section
              v-for="faq in entries"
              :id="faq.slug || faq.id"
              :key="faq.id"
              class="faq-panel"
            >
              <button
                type="button"
                class="faq-panel__trigger"
                :aria-expanded="expanded === (faq.slug || faq.id) ? 'true' : 'false'"
                @click="toggleExpanded(faq.slug || faq.id)"
              >
                <h3 class="faq-question-heading">
                  {{ faq.question }}
                </h3>
                <i
                  class="mdi mdi-chevron-down faq-panel__chevron"
                  :class="{ 'faq-panel__chevron--open': expanded === (faq.slug || faq.id) }"
                  aria-hidden="true"
                />
              </button>
              <div v-if="expanded === (faq.slug || faq.id)" class="faq-panel__content">
                <p class="mb-0 text-sm text-foreground/78">{{ faq.answer }}</p>
                <div class="faq-panel__footer">
                  <NuxtLink
                    :to="buildEntryHashPath(faq)"
                    class="faq-panel__anchor-link"
                    :aria-label="faq.question"
                  >
                    <i class="mdi mdi-link-variant" aria-hidden="true" />
                  </NuxtLink>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div class="mt-4">
          <NuxtLink :to="localePath('/faq')" class="faq-topic-back-link">
            <i class="mdi mdi-arrow-left text-sm" aria-hidden="true" />
            {{ $t("pages.faq.topic.back-link") }}
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick } from "vue";
import { buildFaqTopicPath } from "~/utils/faqPaths";

const route = useRoute();
const localePath = useLocalePath();
const { t, locale, localeProperties } = useI18n();
const config = useRuntimeConfig();

const apiLocale = computed(
  () => localeProperties.value?.iso || locale.value || "en-US"
);

const { data: topicResponse, pending } = await useFetch("/api/faq-topic", {
  query: computed(() => ({
    group: route.params.group,
    topic: route.params.topic,
    locale: apiLocale.value,
  })),
  default: () => ({ success: false, data: null }),
  watch: [apiLocale],
});

if (
  import.meta.server &&
  topicResponse.value &&
  !topicResponse.value.success
) {
  throw createError({ statusCode: 404, statusMessage: "FAQ topic not found" });
}

const topicData = computed(() => topicResponse.value?.data);
const topicTitle = computed(
  () => topicData.value?.topic?.title || String(route.params.topic)
);
const groupTitle = computed(() => topicData.value?.topic?.groupTitle || "");
const topicGroupSlug = computed(
  () => topicData.value?.topic?.groupSlug || String(route.params.group || "")
);
const topicSlug = computed(
  () => topicData.value?.topic?.slug || String(route.params.topic || "")
);
const entries = computed(() => topicData.value?.entries || []);
const relatedTopics = computed(() => topicData.value?.relatedTopics || []);

const expanded = ref(null);

const toggleExpanded = (value) => {
  expanded.value = expanded.value === value ? null : value;
};

const buildEntryHashPath = (faq) => {
  const path = localePath(buildFaqTopicPath(topicGroupSlug.value, topicSlug.value));
  const hash = faq?.slug || faq?.id;
  return hash ? `${path}#${hash}` : path;
};

const syncExpandedWithHash = async () => {
  const hash = String(route.hash || "").replace(/^#/, "");
  if (!hash) return false;
  const match = entries.value.find((entry) => entry.slug === hash || entry.id === hash);
  if (!match) return false;
  expanded.value = match.slug || match.id;
  await nextTick();
  const target = document.getElementById(match.slug || match.id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  return true;
};

watch(
  () => entries.value,
  async (list) => {
    if (!list.length) return;
    if (await syncExpandedWithHash()) return;
    if (!expanded.value) {
      expanded.value = list[0].slug || list[0].id;
    }
  },
  { immediate: true }
);

watch(
  () => [entries.value, route.hash],
  async () => {
    await syncExpandedWithHash();
  }
);

const breadcrumbs = computed(() => [
  {
    title: t("pages.faq.topic.breadcrumb-home"),
    to: localePath("/"),
    disabled: false,
  },
  { title: "FAQ", to: localePath("/faq"), disabled: false },
  { title: groupTitle.value, disabled: true },
  { title: topicTitle.value, disabled: true },
]);

const siteUrl = String(
  config.public?.SITE_URL || "https://imchatty.com"
).replace(/\/+$/, "");
const faqIndexUrl = computed(() => `${siteUrl}${localePath("/faq")}`);
const topicUrl = computed(
  () => `${siteUrl}${localePath(buildFaqTopicPath(topicGroupSlug.value, topicSlug.value))}`
);

useSeoI18nMeta("faq.topic", {
  dynamic: {
    title: computed(() =>
      topicTitle.value
        ? `${topicTitle.value} — ImChatty FAQ`
        : t("pages.faq.topic.meta.title")
    ),
    description: computed(() => {
      if (!entries.value.length) return t("pages.faq.topic.meta.description");
      const firstAnswer = entries.value[0]?.answer || "";
      const preview =
        firstAnswer.length > 130
          ? firstAnswer.slice(0, 127) + "…"
          : firstAnswer;
      return `${topicTitle.value}: ${preview}`;
    }),
    ogTitle: computed(() =>
      topicTitle.value ? `${topicTitle.value} — ImChatty FAQ` : ""
    ),
    ogDescription: computed(() => {
      if (!entries.value.length) return "";
      const count = entries.value.length;
      return `Browse ${count} question${count !== 1 ? "s" : ""} about ${topicTitle.value} on ImChatty.`;
    }),
  },
});

useHead(() => {
  if (!entries.value.length) return {};

  return {
    script: [
      {
        type: "application/ld+json",
        key: "faq-topic-page-schema",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: entries.value.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }),
      },
      {
        type: "application/ld+json",
        key: "faq-topic-breadcrumb-schema",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: t("pages.faq.topic.breadcrumb-home"),
              item: siteUrl,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: "FAQ",
              item: faqIndexUrl.value,
            },
            {
              "@type": "ListItem",
              position: 3,
              name: groupTitle.value,
            },
            {
              "@type": "ListItem",
              position: 4,
              name: topicTitle.value,
              item: topicUrl.value,
            },
          ],
        }),
      },
    ],
  };
});
</script>

<style scoped>
.faq-topic-card {
  border-radius: 16px;
  border: 1px solid rgba(99, 109, 129, 0.2);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 251, 0.94));
}

.faq-topic-nav-card {
  border-radius: 16px;
  border: 1px solid rgba(99, 109, 129, 0.16);
  background: rgba(255, 255, 255, 0.72);
}

.faq-topic-nav-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.faq-section-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.faq-topic-count {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.1);
  color: rgb(var(--color-primary));
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.faq-topic-nav-list {
  display: grid;
  gap: 0.55rem;
}

.faq-topic-nav-link {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(99, 109, 129, 0.14);
  color: rgb(var(--color-foreground) / 0.86);
  text-decoration: none;
  transition: border-color 140ms ease, background 140ms ease, transform 140ms ease;
}

.faq-topic-nav-link:hover {
  border-color: rgb(var(--color-primary) / 0.28);
  background: rgb(var(--color-primary) / 0.05);
  transform: translateY(-1px);
}

.faq-topic-nav-link--active {
  border-color: rgb(var(--color-primary) / 0.28);
  background: rgb(var(--color-primary) / 0.08);
  color: rgb(var(--color-primary));
}

.faq-topic-nav-link__count {
  color: rgb(var(--color-foreground) / 0.58);
  font-size: 0.82rem;
  font-weight: 600;
}

.faq-topic-breadcrumbs__list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  align-items: center;
  padding: 0;
  margin: 0;
  list-style: none;
}

.faq-topic-breadcrumbs__item {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.92rem;
}

.faq-topic-breadcrumbs__link {
  color: rgb(var(--color-primary));
  text-decoration: none;
}

.faq-topic-breadcrumbs__link:hover {
  text-decoration: underline;
}

.faq-topic-breadcrumbs__current {
  color: rgb(var(--color-foreground) / 0.72);
}

.faq-topic-breadcrumbs__divider {
  color: rgb(var(--color-foreground) / 0.45);
  font-size: 0.82rem;
}

.faq-topic-skeleton {
  display: grid;
  gap: 0.75rem;
  padding: 0.5rem;
}

.faq-topic-skeleton__row {
  display: block;
  height: 3rem;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.14) 0%,
    rgba(148, 163, 184, 0.26) 50%,
    rgba(148, 163, 184, 0.14) 100%
  );
  background-size: 200% 100%;
  animation: faq-topic-skeleton-pulse 1.6s ease-in-out infinite;
}

.faq-topic-panels {
  display: grid;
  gap: 0.85rem;
}

.faq-panel {
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid rgba(99, 109, 129, 0.18);
  background: rgba(255, 255, 255, 0.52);
}

.faq-panel__trigger {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 0;
  background: transparent;
  padding: 0.9rem 1rem;
  text-align: left;
  color: inherit;
  cursor: pointer;
}

.faq-question-heading {
  margin: 0;
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
}

.faq-panel__content {
  padding: 0 1rem 1rem;
}

.faq-panel__footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 0.85rem;
}

.faq-panel__anchor-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: rgb(var(--color-primary));
  text-decoration: none;
}

.faq-panel__anchor-link:hover {
  background: rgb(var(--color-primary) / 0.08);
}

.faq-panel__chevron {
  flex: 0 0 auto;
  transition: transform 160ms ease;
}

.faq-panel__chevron--open {
  transform: rotate(180deg);
}

.faq-topic-back-link {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: rgb(var(--color-primary));
  font-size: 0.92rem;
  font-weight: 600;
  text-decoration: none;
}

.faq-topic-back-link:hover {
  text-decoration: underline;
}

@keyframes faq-topic-skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

html.dark .faq-topic-card,
html[data-imchatty-theme="dark"] .faq-topic-card {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border-color: rgba(148, 163, 184, 0.18);
}

html.dark .faq-topic-nav-card,
html[data-imchatty-theme="dark"] .faq-topic-nav-card {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.14);
}

html.dark .faq-panel,
html[data-imchatty-theme="dark"] .faq-panel {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.18);
}
</style>
