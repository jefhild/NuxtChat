<template>
  <v-container fluid class="pa-0 mt-3">
    <v-row>
      <v-col cols="12">
        <v-card class="faq-hero pa-4 pa-md-6" elevation="0">
          <div class="faq-hero-content">
            <div>
              <div class="text-overline text-medium-emphasis">
                {{ $t("pages.about.faq.kicker") }}
              </div>
              <h3 class="text-h5 font-weight-bold">
                {{ $t("pages.about.faq.title") }}
              </h3>
              <p class="text-body-2 text-medium-emphasis">
                {{ $t("pages.about.faq.subtitle") }}
              </p>
            </div>
          <v-chip
            size="small"
            variant="tonal"
            color="primary"
            class="faq-chip"
          >
              {{ filteredFaqs.length }} {{ $t("pages.about.faq.results") }}
          </v-chip>
        </div>
        <v-text-field
          v-model="search"
          :placeholder="$t('pages.about.faq.search-placeholder')"
            prepend-inner-icon="mdi-magnify"
            variant="solo"
            hide-details
            clearable
            class="faq-search mt-2"
          />
        </v-card>
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="4" class="faq-tree-col">
        <v-card class="faq-tree-card pa-3" elevation="0">
          <div class="text-subtitle-2 font-weight-medium mb-3">
            {{ $t("pages.about.faq.tree-title") }}
          </div>
          <v-skeleton-loader
            v-if="pending"
            type="list-item@6"
            class="pa-2"
          />
          <v-treeview
            v-else
            v-model:opened="opened"
            v-model:activated="activated"
            :items="treeItems"
            item-title="title"
            item-value="id"
            item-children="children"
            density="compact"
            color="primary"
            open-on-click
            activatable
            lines="two"
            class="faq-tree"
            @update:activated="handleActivated"
          >
            <template #prepend="{ item }">
              <v-icon
                v-if="item.icon"
                :icon="item.icon"
                size="18"
                class="mr-2"
              />
            </template>
          </v-treeview>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card class="faq-list-card pa-3 pa-md-4" elevation="0">
          <div class="d-flex align-center justify-space-between">
            <div class="text-subtitle-2 font-weight-medium">
              {{ $t("pages.about.faq.list-title") }}
            </div>
            <v-chip size="small" variant="tonal" color="primary">
              {{ filteredFaqs.length }} {{ $t("pages.about.faq.results") }}
            </v-chip>
          </div>
          <v-divider class="my-3" />

          <v-skeleton-loader
            v-if="pending"
            type="list-item@4"
            class="pa-2"
          />
          <div
            v-else-if="!filteredFaqs.length"
            class="text-body-2 text-medium-emphasis"
          >
            {{ $t("pages.about.faq.empty") }}
          </div>
          <v-expansion-panels
            v-else
            v-model="expanded"
            variant="accordion"
            class="faq-panels"
          >
            <v-expansion-panel
              v-for="faq in filteredFaqs"
              :key="faq.id"
              :value="faq.slug || faq.id"
              :id="faq.slug || faq.id"
              class="faq-panel"
            >
              <v-expansion-panel-title>
                <div class="faq-title">
                  <span class="font-weight-medium">{{ faq.question }}</span>
                  <v-chip size="x-small" variant="tonal" color="primary">
                    {{ faq.topicTitle }}
                  </v-chip>
                </div>
              </v-expansion-panel-title>
              <v-expansion-panel-text>
                <p class="text-body-2 mb-0">
                  {{ faq.answer }}
                </p>
              </v-expansion-panel-text>
            </v-expansion-panel>
          </v-expansion-panels>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { nextTick } from "vue";
import { useI18n } from "vue-i18n";

const { t, locale, localeProperties } = useI18n();
const route = useRoute();

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

const treeItems = computed(() =>
  faqGroups.value.map((group) => ({
    id: group.id,
    title: group.title,
    icon: "mdi-folder-outline",
    children: (group.topics || []).map((topic) => ({
      id: topic.id,
      title: topic.title,
    })),
  }))
);

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

const handleActivated = (value) => {
  activeFilter.value = value?.[0] || null;
};

const clearFilters = () => {
  search.value = "";
  activated.value = [];
  activeFilter.value = null;
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
  () => faqGroups.value,
  (groups) => {
    if (!groups.length || opened.value.length) return;
    opened.value = [groups[0].id];
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

.faq-search :deep(.v-field) {
  border-radius: 14px;
}

.faq-tree-card,
.faq-list-card {
  border-radius: 16px;
  border: 1px solid rgba(99, 109, 129, 0.2);
}

.faq-tree :deep(.v-treeview-node__root) {
  border-radius: 12px;
}

.faq-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

.faq-panel :deep(.v-expansion-panel-title) {
  padding: 12px 16px;
}

.faq-panel :deep(.v-expansion-panel-text__wrapper) {
  padding: 0 16px 16px;
}

@media (max-width: 960px) {
  .faq-tree-col {
    display: none;
  }

  .faq-hero-content {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
