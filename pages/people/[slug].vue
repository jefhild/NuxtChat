<template>
  <v-container class="filters-shell" fluid>
    <div class="filters-header-shell">
      <div class="filters-header-actions">
        <v-btn
          icon
          variant="text"
          color="primary"
          aria-label="Open filters"
          class="filters-menu-btn"
          @click="filtersOpen = true"
        >
          <v-icon>mdi-menu</v-icon>
        </v-btn>
      </div>
      <PageHeader :text="pageHeading" :subtitle="pageSubtitle" />
    </div>

    <v-navigation-drawer
      v-model="filtersOpen"
      location="left"
      temporary
      width="360"
      :style="filtersDrawerStyle"
      class="filters-drawer"
      aria-label="People filters"
    >
      <v-list density="compact" class="filters-drawer-list">
        <v-list-subheader>{{ $t("pages.articles.index.filters") }}</v-list-subheader>
        <div class="filters-drawer-title px-3 pb-2">
          {{ pageHeading }}
        </div>
        <v-divider />
        <div class="px-3 py-2 d-flex flex-column ga-3">
          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="categories"
            :title="$t('pages.categories.index.title')"
            :items="categories"
            base-path="/categories"
            :selected-slug="null"
            panels-class="compact-panel"
            variant="inset"
            :scrolling-list="true"
          >
            <template #title="{ selectedName, title }">
              <span>Categories: {{ selectedName || title }}</span>
            </template>
          </FilterExpansion>

          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="tags"
            :title="$t('pages.tags.index.title')"
            :items="tags"
            base-path="/tags"
            :selected-slug="null"
            panels-class="compact-panel"
            variant="inset"
            :scrolling-list="true"
          >
            <template #title="{ selectedName, title }">
              <span>Tags: {{ selectedName || title }}</span>
            </template>
          </FilterExpansion>

          <FilterExpansion
            v-model="openFilterPanel"
            panel-key="people"
            :title="$t('pages.people.index.title')"
            :items="people"
            base-path="/people"
            :selected-slug="route.params?.slug || null"
            panels-class="compact-panel"
            variant="inset"
            :scrolling-list="true"
          >
            <template #title="{ selectedName, title }">
              <span>People: {{ selectedName || title }}</span>
            </template>
          </FilterExpansion>
        </div>
      </v-list>
    </v-navigation-drawer>

    <LoadingContainer
      v-if="isLoading"
      :text="$t('pages.articles.index.loading')"
    />

    <v-container v-else fluid>

      <v-row>
        <v-col
          v-for="article in articles"
          :key="article.id"
          cols="12"
          sm="6"
          md="4"
          class="d-flex"
        >
          <ArticleCard
            :article="article"
            :chatThreadId="article.thread_slug ?? undefined"
          />
        </v-col>
      </v-row>

      <v-row v-if="!articles.length" justify="center">
        <v-col class="text-center">
          <p>
            {{
              $t("pages.people.slug.no-articles", {
                name: displayName,
              })
            }}
          </p>
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
        :base-path="buildTaxonomyPath('/people', slug)"
        :current-page="activePage"
        :total-pages="totalPages"
      />

      <div
        ref="infiniteScrollTrigger"
        class="infinite-scroll-trigger"
        aria-hidden="true"
      />
    </v-container>
  </v-container>
</template>

<script setup>
import { shouldIndexTaxonomyPage } from "@/composables/useIndexability";
import { useSeoI18nMeta } from "@/composables/useSeoI18nMeta";
import { buildTaxonomyPath } from "@/utils/taxonomySlug";

const PAGE_SIZE = 24;

const parsePage = (value) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(String(raw || "1"), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const route = useRoute();
const { t, locale } = useI18n();
const config = useRuntimeConfig();
const siteConfig = useSiteConfig();
const supabaseBucket = config.public.SUPABASE_BUCKET;
const baseUrl = (siteConfig?.url || config.public.SITE_URL || "").replace(
  /\/+$/,
  ""
);

const {
  getAllCategories,
  getAllTags,
  getAllPeople,
  getPersonArticleCardsPage,
} = useDb();

const person = ref(null);
const categories = ref([]);
const tags = ref([]);
const people = ref([]);
const articles = ref([]);
const openFilterPanel = ref(null);
const filtersOpen = ref(false);
const filtersDrawerStyle = { zIndex: 1004, transition: "none !important" };
const slug = computed(() => route.params.slug);
const currentPage = computed(() => parsePage(route.query.page));
const currentLocale = computed(() => locale.value || "en");
const baseLocale = computed(() =>
  String(currentLocale.value || "en").split("-")[0].toLowerCase()
);
const totalArticles = ref(0);
const activePage = ref(currentPage.value);
const hasMoreArticles = ref(false);
const isFetchingMore = ref(false);
const infiniteScrollTrigger = ref(null);
let intersectionObserver = null;

const formattedSlug = computed(() => {
  const raw = route.params.slug;
  return raw
    ? raw
        .toString()
        .replaceAll("-", " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";
});

const displayName = computed(
  () => person.value?.name || formattedSlug.value || t("pages.people.index.title")
);

const pageHeading = computed(
  () => displayName.value || t("pages.people.index.title")
);
const pageSubtitle = computed(() => t("pages.people.index.subtitle"));

const normalizeLocaleCode = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0];

const availableTaxonomyLocales = computed(() => {
  const locales = new Set(["en"]);
  let hasLocaleMetadata = false;

  for (const article of articles.value || []) {
    const originalLocale = normalizeLocaleCode(article?.original_language_code);
    if (originalLocale) {
      locales.add(originalLocale);
      hasLocaleMetadata = true;
    }
    const translations = Array.isArray(article?.article_translations)
      ? article.article_translations
      : [];
    for (const entry of translations) {
      const translationLocale = normalizeLocaleCode(entry?.locale);
      if (translationLocale) {
        locales.add(translationLocale);
        hasLocaleMetadata = true;
      }
    }
  }

  return hasLocaleMetadata ? Array.from(locales) : ["en"];
});

const canonicalLocale = computed(() => baseLocale.value || "en");
const canonicalPath = computed(() => {
  const path = route.path || "/";
  return currentPage.value > 1 ? `${path}?page=${currentPage.value}` : path;
});
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalArticles.value / PAGE_SIZE))
);
const shouldIndexPage = computed(() =>
  shouldIndexTaxonomyPage(totalArticles.value, "person")
);
const taxonomyRobots = computed(() =>
  shouldIndexPage.value ? undefined : "noindex,follow"
);

const firstImage = computed(() => {
  const filename = articles.value[0]?.image_path;
  if (!filename) return "/default-og-image.jpg";
  return `${supabaseBucket}/articles/${filename.replace(/^articles\//, "")}`;
});

const limitedDescription = computed(() =>
  t("pages.people.slug.metaDescription", { name: displayName.value })
);

const pagePath = (page) => {
  const path = route.path || "/";
  return page > 1 ? `${path}?page=${page}` : path;
};

const pageSuffix = computed(() => {
  if (currentPage.value <= 1) return "";
  const formattedPage = new Intl.NumberFormat(currentLocale.value || "en").format(
    currentPage.value
  );
  if (baseLocale.value === "fr") return ` | Page ${formattedPage}`;
  if (baseLocale.value === "ru") return ` | Страница ${formattedPage}`;
  if (baseLocale.value === "zh") return ` | 第${formattedPage}页`;
  return ` | Page ${formattedPage}`;
});

const pagedDescriptionSuffix = computed(() => {
  if (currentPage.value <= 1) return "";
  const formattedPage = new Intl.NumberFormat(currentLocale.value || "en").format(
    currentPage.value
  );
  if (baseLocale.value === "fr") return ` Page ${formattedPage}.`;
  if (baseLocale.value === "ru") return ` Страница ${formattedPage}.`;
  if (baseLocale.value === "zh") return ` 第${formattedPage}页。`;
  return ` Page ${formattedPage}.`;
});

const toAbsolute = (path) => {
  const normalizedBase = baseUrl.replace(/\/$/, "");
  return normalizedBase ? `${normalizedBase}${path}` : path;
};

useSeoI18nMeta("people.index", {
  availableLocaleCodes: availableTaxonomyLocales,
  canonicalLocaleCode: canonicalLocale.value,
  overrideUrl: `${baseUrl}${canonicalPath.value === "/" ? "" : canonicalPath.value}`,
  robots: taxonomyRobots,
  dynamic: {
    title: computed(() => `${pageHeading.value} – ImChatty${pageSuffix.value}`),
    description: computed(() => `${limitedDescription.value}${pagedDescriptionSuffix.value}`),
    ogTitle: computed(() => `${pageHeading.value} – ImChatty${pageSuffix.value}`),
    ogDescription: computed(
      () => `${limitedDescription.value}${pagedDescriptionSuffix.value}`
    ),
    ogImage: firstImage,
    twitterTitle: computed(() => `${pageHeading.value} – ImChatty${pageSuffix.value}`),
    twitterDescription: computed(
      () => `${limitedDescription.value}${pagedDescriptionSuffix.value}`
    ),
    twitterImage: firstImage,
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

const loadMoreArticles = () => {
  if (!hasMoreArticles.value || isFetchingMore.value || isLoading.value) return;
  isFetchingMore.value = true;
  const nextPage = activePage.value + 1;

  getPersonArticleCardsPage({
    slug: slug.value,
    limit: PAGE_SIZE,
    offset: (nextPage - 1) * PAGE_SIZE,
  })
    .then((nextPageData) => {
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
    })
    .finally(() => {
      isFetchingMore.value = false;
    });
};

onMounted(async () => {
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

const currentOffset = computed(() => (currentPage.value - 1) * PAGE_SIZE);

const { data: initialData, pending } = await useAsyncData(
  () => `person-page-${slug.value}-${currentPage.value}`,
  async () => {
    const [categoryData, tagData, peopleData, personResult] = await Promise.all(
      [
        getAllCategories(),
        getAllTags(),
        getAllPeople(),
        getPersonArticleCardsPage({
          slug: slug.value,
          limit: PAGE_SIZE,
          offset: currentOffset.value,
        }),
      ]
    );

    return {
      categories: categoryData || [],
      tags: tagData || [],
      people: peopleData || [],
      person: personResult?.person || null,
      articles: personResult?.articles || [],
      totalCount: Number(personResult?.totalCount || 0),
    };
  },
  { watch: [slug, currentPage], server: true }
);

if (!initialData.value?.person) {
  throw createError({ statusCode: 404, statusMessage: "Person not found" });
}

const initialTotalPages = Math.max(
  1,
  Math.ceil(Number(initialData.value?.totalCount || 0) / PAGE_SIZE)
);
if (currentPage.value > initialTotalPages && Number(initialData.value?.totalCount || 0) > 0) {
  throw createError({ statusCode: 404, statusMessage: "Person page not found" });
}

watchEffect(() => {
  if (!initialData.value) return;
  categories.value = initialData.value.categories || [];
  tags.value = initialData.value.tags || [];
  people.value = initialData.value.people || [];
  person.value = initialData.value.person || null;
  articles.value = initialData.value.articles || [];
  totalArticles.value = Number(initialData.value.totalCount || 0);
  activePage.value = currentPage.value;
  hasMoreArticles.value = currentPage.value < totalPages.value;
});

const isLoading = computed(() => pending.value);
</script>

<style scoped>
.filters-shell {
  padding-top: 6px;
}

.filters-header-shell {
  position: relative;
  margin-bottom: 8px;
}

.filters-header-actions {
  position: absolute;
  top: 6px;
  left: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 1;
}

.filters-menu-btn {
  margin: 0;
}

.filters-header-shell :deep(.page-header-row) {
  padding-left: 52px;
  box-sizing: border-box;
}

.filters-drawer {
  margin-top: 64px;
  height: calc(100% - 64px);
  overflow: hidden;
}

.filters-drawer :deep(.v-navigation-drawer__content) {
  overflow-y: auto;
}

.filters-drawer-title {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.6);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.infinite-scroll-trigger {
  width: 100%;
  height: 2px;
}
</style>
