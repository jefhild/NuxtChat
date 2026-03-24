<template>
  <v-container fluid class="articles-shell">
    <div class="articles-header-shell">
      <div class="articles-header-actions">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          class="articles-menu-btn"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader
        :text="$t('pages.articles.index.heading')"
        :subtitle="$t('pages.articles.index.subtitle')"
      />
    </div>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="280"
      class="articles-drawer"
      aria-label="Article filters"
    >
      <v-list density="compact" class="articles-drawer-list">
        <v-list-subheader>{{ $t("pages.articles.index.filters") }}</v-list-subheader>
        <div class="px-3 py-2">
          <v-alert type="info" variant="tonal" density="comfortable">
            {{ $t("pages.articles.index.filters") }}
          </v-alert>
        </div>
      </v-list>
    </v-navigation-drawer>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <template v-else>
      <v-row dense>
        <v-col
          v-for="article in articles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
        >
          <ArticleCard
            :article="article"
            :chat-thread-id="threadByArticleId[article.id] || article.thread_slug || null"
          />
        </v-col>
      </v-row>

      <v-row v-if="!articles.length" justify="center">
        <v-col cols="12" class="text-center">
          <v-alert
            type="info"
            variant="tonal"
            border="top"
            border-color="primary"
          >
            {{ $t("pages.articles.index.no-articles") }}
          </v-alert>
        </v-col>
      </v-row>

      <v-row
        v-if="isFetchingMore && hasMoreArticles"
        justify="center"
        class="my-6"
      >
        <v-col cols="auto">
          <v-progress-circular indeterminate color="primary" />
        </v-col>
      </v-row>

      <TaxonomyPagination
        base-path="/articles"
        :current-page="activePage"
        :total-pages="totalPages"
      />

      <div
        ref="infiniteScrollTrigger"
        class="infinite-scroll-trigger"
        aria-hidden="true"
      />
    </template>
  </v-container>
</template>

<script setup>
import { useI18n } from "vue-i18n";

const PAGE_SIZE = 24;

const parsePage = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw || "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const route = useRoute();
const config = useRuntimeConfig();
const siteConfig = useSiteConfig();
const { getPublishedArticleCardsPageData } = useDb();
const { t, locale } = useI18n();
const baseUrl = (siteConfig?.url || config.public.SITE_URL || "").replace(
  /\/+$/,
  ""
);
const currentPage = computed(() => parsePage(route.query.page));
const currentOffset = computed(() => (currentPage.value - 1) * PAGE_SIZE);
const articles = ref([]);
const filtersOpen = ref(false);
const totalArticles = ref(0);
const activePage = ref(currentPage.value);
const hasMoreArticles = ref(false);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalArticles.value / PAGE_SIZE))
);
const baseLocale = computed(() =>
  String(locale.value || "en").split("-")[0].toLowerCase()
);

const pageSuffix = computed(() => {
  if (currentPage.value <= 1) return "";
  const formattedPage = new Intl.NumberFormat(locale.value || "en").format(
    currentPage.value
  );
  if (baseLocale.value === "fr") return ` | Page ${formattedPage}`;
  if (baseLocale.value === "ru") return ` | Страница ${formattedPage}`;
  if (baseLocale.value === "zh") return ` | 第${formattedPage}页`;
  return ` | Page ${formattedPage}`;
});

const pagedDescriptionSuffix = computed(() => {
  if (currentPage.value <= 1) return "";
  const formattedPage = new Intl.NumberFormat(locale.value || "en").format(
    currentPage.value
  );
  if (baseLocale.value === "fr") return ` Page ${formattedPage}.`;
  if (baseLocale.value === "ru") return ` Страница ${formattedPage}.`;
  if (baseLocale.value === "zh") return ` 第${formattedPage}页。`;
  return ` Page ${formattedPage}.`;
});

const { data: chatMap } = await useAsyncData("chat-map", () =>
  $fetch("/api/articles/chat-map")
);
const threadByArticleId = computed(() => chatMap.value || {});

const pagePath = (page) => {
  const basePath = "/articles";
  return page > 1 ? `${basePath}?page=${page}` : basePath;
};

const toAbsolute = (path) => {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return normalizedBase ? `${normalizedBase}${path}` : path;
};

const { data: initialData, pending } = await useAsyncData(
  () => `articles-index-initial-${currentPage.value}`,
  async () => {
    const articlePageData = await getPublishedArticleCardsPageData({
      limit: PAGE_SIZE,
      offset: currentOffset.value,
    });

    return {
      articles: articlePageData?.articles || [],
      totalCount: Number(articlePageData?.totalCount || 0),
    };
  },
  { watch: [currentPage], server: true }
);

const initialTotalPages = Math.max(
  1,
  Math.ceil(Number(initialData.value?.totalCount || 0) / PAGE_SIZE)
);
if (currentPage.value > initialTotalPages && Number(initialData.value?.totalCount || 0) > 0) {
  throw createError({ statusCode: 404, statusMessage: "Articles page not found" });
}

watchEffect(() => {
  if (!initialData.value) return;
  articles.value = initialData.value.articles || [];
  totalArticles.value = Number(initialData.value.totalCount || 0);
  activePage.value = currentPage.value;
  hasMoreArticles.value = currentPage.value < totalPages.value;
});

const isLoading = computed(() => pending.value);

const loadMoreArticles = async () => {
  if (!hasMoreArticles.value || isFetchingMore.value || isLoading.value) {
    return;
  }

  isFetchingMore.value = true;
  const nextPage = activePage.value + 1;

  try {
    const nextPageData = await getPublishedArticleCardsPageData({
      limit: PAGE_SIZE,
      offset: (nextPage - 1) * PAGE_SIZE,
    });
    const existingIds = new Set(articles.value.map((article) => article.id));
    const uniqueNextArticles = (nextPageData?.articles || []).filter(
      (article) => !existingIds.has(article.id)
    );

    if (uniqueNextArticles.length) {
      articles.value = [...articles.value, ...uniqueNextArticles];
    }

    activePage.value = nextPage;
    hasMoreArticles.value = nextPage < totalPages.value;

    if (import.meta.client) {
      window.history.replaceState(window.history.state, "", pagePath(nextPage));
    }
  } finally {
    isFetchingMore.value = false;
  }
};

onMounted(() => {
  if (!intersectionObserver) {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMoreArticles();
        }
      },
      { rootMargin: "0px 0px 200px 0px", threshold: 0 }
    );
  }

  if (infiniteScrollTrigger.value) {
    intersectionObserver.observe(infiniteScrollTrigger.value);
  }
});

watch(
  () => infiniteScrollTrigger.value,
  (el) => {
    if (!intersectionObserver || !el) return;
    intersectionObserver.disconnect();
    intersectionObserver.observe(el);
  }
);

onBeforeUnmount(() => {
  intersectionObserver?.disconnect();
});

useSeoI18nMeta("articles.index", {
  overrideUrl: `${baseUrl}${currentPage.value > 1 ? pagePath(currentPage.value) : "/articles"}`,
  dynamic: {
    title: computed(() => `${t("pages.articles.index.meta.title")}${pageSuffix.value}`),
    description: computed(
      () => `${t("pages.articles.index.meta.description")}${pagedDescriptionSuffix.value}`
    ),
    ogTitle: computed(() => `${t("pages.articles.index.meta.ogTitle")}${pageSuffix.value}`),
    ogDescription: computed(
      () => `${t("pages.articles.index.meta.ogDescription")}${pagedDescriptionSuffix.value}`
    ),
    twitterTitle: computed(
      () => `${t("pages.articles.index.meta.twitterTitle")}${pageSuffix.value}`
    ),
    twitterDescription: computed(
      () =>
        `${t("pages.articles.index.meta.twitterDescription")}${pagedDescriptionSuffix.value}`
    ),
  },
});

useHead(() => ({
  link: [
    ...(currentPage.value > 1
      ? [{ rel: "prev", href: toAbsolute(pagePath(currentPage.value - 1)) }]
      : []),
    ...(currentPage.value < totalPages.value
      ? [{ rel: "next", href: toAbsolute(pagePath(currentPage.value + 1)) }]
      : []),
  ],
}));
</script>

<style scoped>
.articles-shell {
  padding-top: 6px;
}

.articles-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.articles-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.articles-menu-btn {
  margin: 0;
}

.articles-drawer {
  margin-top: 64px;
  height: calc(100% - 64px);
  overflow: hidden;
}

.articles-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
