<template>
  <div class="mt-3 space-y-6">
    <div>
      <div class="w-full">
        <div class="faq-hero p-4 md:p-6">
          <div class="faq-hero-content">
            <div>
              <div class="faq-kicker">
                {{ $t("pages.about.faq.kicker") }}
              </div>
              <h3 class="faq-hero-title">
                {{ $t("pages.about.faq.title") }}
              </h3>
              <p class="faq-hero-subtitle">
                {{ $t("pages.about.faq.subtitle") }}
              </p>
            </div>
            <span class="faq-chip">
              {{ filteredFaqs.length }} {{ $t("pages.about.faq.results") }}
            </span>
          </div>

          <div class="faq-search mt-2">
            <i class="mdi mdi-magnify faq-search__icon" aria-hidden="true" />
            <input
              v-model="search"
              :placeholder="$t('pages.about.faq.search-placeholder')"
              class="faq-search__input"
              type="search"
            >
            <button
              v-if="search"
              type="button"
              class="faq-search__clear"
              aria-label="Clear search"
              @click="search = ''"
            >
              <i class="mdi mdi-close" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-6 md:grid-cols-12">
      <div class="faq-tree-col w-full md:col-span-4">
        <div class="faq-tree-card p-3">
          <div class="faq-section-title mb-3">
            {{ $t("pages.about.faq.tree-title") }}
          </div>

          <div v-if="pending" class="faq-tree-skeleton" aria-hidden="true">
            <span v-for="index in 6" :key="index" class="faq-tree-skeleton__row" />
          </div>

          <div v-else class="faq-tree">
            <section
              v-for="group in faqGroups"
              :key="group.id"
              class="faq-tree-group"
            >
              <button
                type="button"
                class="faq-tree-group__button"
                :class="{ 'faq-tree-group__button--active': isFilterActive(group.id) }"
                :aria-expanded="isGroupOpen(group.id) ? 'true' : 'false'"
                @click="toggleGroup(group.id)"
              >
                <span class="faq-tree-group__label">
                  <i class="mdi mdi-folder-outline text-sm" aria-hidden="true" />
                  <span>{{ group.title }}</span>
                </span>
                <i
                  class="mdi mdi-chevron-down faq-tree-group__chevron"
                  :class="{ 'faq-tree-group__chevron--open': isGroupOpen(group.id) }"
                  aria-hidden="true"
                />
              </button>

              <div v-if="isGroupOpen(group.id)" class="faq-tree-group__children">
                <div
                  v-for="topic in group.topics || []"
                  :key="topic.id"
                  class="faq-tree-topic"
                >
                  <button
                    type="button"
                    class="faq-tree-topic__button"
                    :class="{ 'faq-tree-topic__button--active': isFilterActive(topic.id) }"
                    @click="selectFilter(topic.id, group.id)"
                  >
                    {{ topic.title }}
                  </button>
                  <NuxtLink
                    :to="localePath(buildFaqTopicPath(topic.groupSlug, topic.slug))"
                    class="faq-tree-topic__link"
                    :aria-label="topic.title"
                  >
                    <i class="mdi mdi-open-in-new" aria-hidden="true" />
                  </NuxtLink>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      <div class="w-full md:col-span-8">
        <div class="faq-list-card p-3 md:p-4">
          <div class="flex items-center justify-between gap-3">
            <div class="faq-section-title">
              {{ $t("pages.about.faq.list-title") }}
            </div>
            <span class="faq-chip">
              {{ filteredFaqs.length }} {{ $t("pages.about.faq.results") }}
            </span>
          </div>
          <hr class="faq-divider my-3">

          <div v-if="pending" class="faq-list-skeleton" aria-hidden="true">
            <span v-for="index in 4" :key="index" class="faq-list-skeleton__row" />
          </div>

          <div
            v-else-if="!filteredFaqs.length"
            class="text-sm text-foreground/70"
          >
            {{ $t("pages.about.faq.empty") }}
          </div>

          <div
            v-else
            class="faq-panels"
          >
            <section
              v-for="faq in filteredFaqs"
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
                <div class="faq-title">
                  <h3 class="faq-question-heading">{{ faq.question }}</h3>
                  <span class="faq-chip faq-chip--small">
                    {{ faq.topicTitle }}
                  </span>
                </div>
                <i
                  class="mdi mdi-chevron-down faq-panel__chevron"
                  :class="{ 'faq-panel__chevron--open': expanded === (faq.slug || faq.id) }"
                  aria-hidden="true"
                />
              </button>
              <div v-if="expanded === (faq.slug || faq.id)" class="faq-panel__content">
                <p class="mb-0 text-sm text-foreground/78">
                  {{ faq.answer }}
                </p>
                <div class="faq-panel__footer">
                  <NuxtLink
                    :to="buildTopicEntryPath(faq)"
                    class="faq-panel__topic-link"
                  >
                    <i class="mdi mdi-link-variant" aria-hidden="true" />
                    <span>{{ faq.topicTitle }}</span>
                  </NuxtLink>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick } from "vue";
import { useI18n } from "vue-i18n";
import { buildFaqTopicPath } from "~/utils/faqPaths";

const { locale, localeProperties } = useI18n();
const route = useRoute();
const localePath = useLocalePath();

const search = ref("");
const opened = ref([]);
const activated = ref([]);
const activeFilter = ref(null);
const expanded = ref(null);

const apiLocale = computed(
  () => localeProperties.value?.iso || locale.value || "en-US"
);

const { data: faqResponse, pending } = await useFetch("/api/faqs", {
  query: computed(() => ({ locale: apiLocale.value })),
  default: () => ({ success: true, data: { groups: [], entries: [] } }),
  watch: [apiLocale],
});

const faqGroups = computed(() => faqResponse.value?.data?.groups || []);
const faqEntries = computed(() => faqResponse.value?.data?.entries || []);

const filteredFaqs = computed(() => {
  const term = search.value.trim().toLowerCase();
  const active = activeFilter.value || activated.value[0];

  return faqEntries.value.filter((entry) => {
    const matchesSearch =
      !term ||
      entry.question.toLowerCase().includes(term) ||
      entry.answer.toLowerCase().includes(term);

    const matchesFilter =
      !active ||
      entry.groupId === active ||
      entry.topicId === active;

    return matchesSearch && matchesFilter;
  });
});

const clearFilters = () => {
  search.value = "";
  activated.value = [];
  activeFilter.value = null;
};

const toggleExpanded = (value) => {
  expanded.value = expanded.value === value ? null : value;
};

const buildTopicEntryPath = (faq) => {
  if (!faq?.topicSlug || !faq?.groupSlug) return localePath("/faq");
  const path = localePath(buildFaqTopicPath(faq.groupSlug, faq.topicSlug));
  const hash = faq.slug || faq.id;
  return hash ? `${path}#${hash}` : path;
};

const isGroupOpen = (id) => opened.value.includes(id);

const isFilterActive = (id) => (activeFilter.value || activated.value[0]) === id;

const selectFilter = (id, groupId = null) => {
  if (!id) return;
  search.value = "";
  activeFilter.value = id;
  activated.value = [id];
  if (groupId && !opened.value.includes(groupId)) {
    opened.value = [...opened.value, groupId];
  }
  const firstEntry = faqEntries.value.find(
    (entry) => entry.groupId === id || entry.topicId === id
  );
  if (firstEntry) {
    expanded.value = firstEntry.slug || firstEntry.id;
  }
};

const toggleGroup = (groupId) => {
  if (!groupId) return;
  const isOpen = opened.value.includes(groupId);
  if (isOpen) {
    opened.value = opened.value.filter((id) => id !== groupId);
    return;
  }

  opened.value = [...opened.value, groupId];
  selectFilter(groupId, groupId);
};

const normalizeRouteQueryValue = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  return String(raw || "").trim().toLowerCase();
};

const applyRouteFilter = () => {
  const topicSlug = normalizeRouteQueryValue(route.query.topic);
  const groupSlug = normalizeRouteQueryValue(route.query.group);

  if (topicSlug) {
    for (const group of faqGroups.value) {
      const topic = (group.topics || []).find(
        (item) => String(item.slug || "").toLowerCase() === topicSlug
      );
      if (topic) {
        selectFilter(topic.id, group.id);
        return true;
      }
    }
  }

  if (groupSlug) {
    const group = faqGroups.value.find(
      (item) => String(item.slug || "").toLowerCase() === groupSlug
    );
    if (group) {
      selectFilter(group.id, group.id);
      return true;
    }
  }

  return false;
};

const applyHash = async () => {
  const hash = route.hash.replace(/^#/, "");
  if (!hash) return;
  const match = faqEntries.value.find(
    (entry) => entry.slug === hash || entry.id === hash
  );
  if (!match) return;
  clearFilters();
  expanded.value = match.slug || match.id;
  await nextTick();
  const target = document.getElementById(match.slug || match.id);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
};

watch(
  () => [faqGroups.value, faqEntries.value, route.query.group, route.query.topic],
  (groups) => {
    const currentGroups = groups[0] || [];
    if (!currentGroups.length) return;
    if (applyRouteFilter()) return;
    if (opened.value.length) return;
    opened.value = [currentGroups[0].id];
    if (!route.hash && !activeFilter.value) {
      activated.value = [currentGroups[0].id];
      activeFilter.value = currentGroups[0].id;
    }
    if (!route.hash && !expanded.value) {
      const firstEntry = faqEntries.value.find((e) => e.groupId === currentGroups[0].id);
      if (firstEntry) expanded.value = firstEntry.slug || firstEntry.id;
    }
  },
  { immediate: true }
);

watch(
  () => [faqEntries.value, route.hash],
  async () => {
    await applyHash();
  }
);
</script>

<style scoped>
.faq-hero {
  background: linear-gradient(135deg, rgba(63, 81, 181, 0.08), rgba(25, 118, 210, 0.06));
  border-radius: 18px;
  border: 1px solid rgba(63, 81, 181, 0.12);
}

.faq-hero-content {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.faq-kicker {
  margin-bottom: 0.25rem;
  color: rgb(var(--color-foreground) / 0.6);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.faq-hero-title {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  line-height: 1.25;
  font-weight: 700;
}

.faq-hero-subtitle {
  margin: 0;
  color: rgb(var(--color-foreground) / 0.72);
  font-size: 0.95rem;
}

.faq-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgb(var(--color-primary) / 0.12);
  color: rgb(var(--color-primary));
  padding: 0.42rem 0.8rem;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  text-transform: uppercase;
}

.faq-chip--small {
  padding: 0.28rem 0.6rem;
  font-size: 0.67rem;
}

.faq-search {
  position: relative;
}

.faq-search__icon {
  position: absolute;
  top: 50%;
  left: 0.95rem;
  transform: translateY(-50%);
  color: rgb(var(--color-foreground) / 0.55);
  pointer-events: none;
}

.faq-search__input {
  width: 100%;
  border-radius: 14px;
  border: 1px solid rgb(var(--color-border) / 0.8);
  background: rgb(var(--color-surface));
  color: rgb(var(--color-foreground));
  padding: 0.85rem 2.8rem 0.85rem 2.8rem;
  font-size: 0.95rem;
}

.faq-search__input:focus {
  outline: 2px solid rgb(var(--color-primary) / 0.28);
  outline-offset: 2px;
}

.faq-search__clear {
  position: absolute;
  top: 50%;
  right: 0.7rem;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: rgb(var(--color-foreground) / 0.62);
  cursor: pointer;
}

.faq-search__clear:hover,
.faq-search__clear:focus-visible {
  background: rgb(var(--color-primary) / 0.1);
  outline: none;
}

.faq-tree-card,
.faq-list-card {
  border-radius: 16px;
  border: 1px solid rgba(99, 109, 129, 0.2);
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 251, 0.94));
}

.faq-section-title {
  font-size: 0.95rem;
  font-weight: 600;
}

.faq-divider {
  border: 0;
  border-top: 1px solid rgb(var(--color-border) / 0.7);
}

.faq-tree-skeleton,
.faq-list-skeleton {
  display: grid;
  gap: 0.75rem;
  padding: 0.5rem;
}

.faq-tree-skeleton__row,
.faq-list-skeleton__row {
  display: block;
  height: 2.9rem;
  border-radius: 14px;
  background: linear-gradient(
    90deg,
    rgba(148, 163, 184, 0.14) 0%,
    rgba(148, 163, 184, 0.26) 50%,
    rgba(148, 163, 184, 0.14) 100%
  );
  background-size: 200% 100%;
  animation: faq-skeleton-pulse 1.6s ease-in-out infinite;
}

.faq-tree {
  display: grid;
  gap: 0.5rem;
}

.faq-tree-group {
  display: grid;
  gap: 0.4rem;
}

.faq-tree-group__button,
.faq-tree-topic__button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.faq-tree-group__button {
  padding: 0.72rem 0.8rem;
  font-weight: 600;
}

.faq-tree-topic__button {
  padding: 0.55rem 0.8rem 0.55rem 2rem;
  color: rgb(var(--color-foreground) / 0.76);
  font-size: 0.92rem;
}

.faq-tree-group__button:hover,
.faq-tree-group__button:focus-visible,
.faq-tree-topic__button:hover,
.faq-tree-topic__button:focus-visible {
  background: rgb(var(--color-primary) / 0.1);
  outline: none;
}

.faq-tree-group__button--active,
.faq-tree-topic__button--active {
  background: rgb(var(--color-primary) / 0.16);
  color: rgb(var(--color-primary));
}

.faq-tree-group__label {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
}

.faq-tree-group__children {
  display: grid;
  gap: 0.25rem;
}

.faq-tree-topic {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.faq-tree-topic__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: rgb(var(--color-primary));
  text-decoration: none;
}

.faq-tree-topic__link:hover,
.faq-tree-topic__link:focus-visible {
  background: rgb(var(--color-primary) / 0.08);
  outline: none;
}

.faq-tree-group__chevron {
  transition: transform 160ms ease;
}

.faq-tree-group__chevron--open {
  transform: rotate(180deg);
}

.faq-panels {
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

.faq-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
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

.faq-panel__topic-link {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: rgb(var(--color-primary));
  font-size: 0.82rem;
  font-weight: 600;
  text-decoration: none;
}

.faq-panel__topic-link:hover {
  text-decoration: underline;
}

.faq-panel__chevron {
  flex: 0 0 auto;
  transition: transform 160ms ease;
}

.faq-panel__chevron--open {
  transform: rotate(180deg);
}

@keyframes faq-skeleton-pulse {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

html.dark .faq-tree-card,
html.dark .faq-list-card,
html.dark .faq-hero,
html[data-imchatty-theme="dark"] .faq-tree-card,
html[data-imchatty-theme="dark"] .faq-list-card,
html[data-imchatty-theme="dark"] .faq-hero {
  background:
    linear-gradient(145deg, rgba(15, 23, 42, 0.96), rgba(30, 41, 59, 0.94));
  border-color: rgba(148, 163, 184, 0.18);
}

html.dark .faq-panel,
html[data-imchatty-theme="dark"] .faq-panel {
  background: rgba(15, 23, 42, 0.72);
  border-color: rgba(148, 163, 184, 0.18);
}

@media (max-width: 960px) {
  .faq-hero-content {
    flex-direction: column;
    align-items: flex-start;
  }

  .faq-title {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
