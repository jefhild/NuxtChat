import {
  getRegisteredUsersDisplaynames,
  getAllPublishedArticlesWithTags,
  getAllCategories,
  getAllTags,
  getAllPeopleSlugs,
  getUserSlugFromDisplayName,
} from "../lib/supabaseHelpers";
import { getGenderFromId } from "../lib/dbUtils";

/**
 * Returns an array of dynamic route strings.
 * Used for Nitro prerendering (must return string[]).
 */
const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];
const defaultLocale = "en";
const supabaseArticlesBase = (
  process.env.NUXT_PUBLIC_SUPABASE_BUCKET || ""
).replace(/\/+$/, "");

function localizePath(path: string, locale: string) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
}

function buildArticleImageUrl(imagePath?: string | null) {
  if (!imagePath || !supabaseArticlesBase) return null;
  const cleanPath = String(imagePath).replace(/^\/+/, "");
  return cleanPath ? `${supabaseArticlesBase}/articles/${cleanPath}` : null;
}

function normalizeLocaleCode(value?: string | null) {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .split("-")[0];
  return normalized || "";
}

function getArticleAvailableLocales(article: any): string[] {
  const available = new Set<string>();
  const originalLocale = normalizeLocaleCode(article?.original_language_code);
  if (originalLocale) {
    available.add(originalLocale);
  } else {
    available.add(defaultLocale);
  }

  const translations = Array.isArray(article?.article_translations)
    ? article.article_translations
    : [];

  translations.forEach((entry: any) => {
    const locale = normalizeLocaleCode(entry?.locale);
    if (locale) available.add(locale);
  });

  return SUPPORTED_LOCALES.filter((locale) => available.has(locale));
}

function addSlugLocales(
  map: Map<string, Set<string>>,
  slug: string | null | undefined,
  locales: string[]
) {
  const key = String(slug || "").trim();
  if (!key || !locales.length) return;
  if (!map.has(key)) {
    map.set(key, new Set<string>());
  }
  const target = map.get(key)!;
  locales.forEach((locale) => target.add(locale));
}

function getSlugLocales(map: Map<string, Set<string>>, slug?: string | null): string[] {
  const key = String(slug || "").trim();
  if (!key) return [];
  return Array.from(map.get(key) || []);
}

function buildTaxonomyLocalesBySlug(articleData: any[] = []) {
  const categoryLocalesBySlug = new Map<string, Set<string>>();
  const tagLocalesBySlug = new Map<string, Set<string>>();
  const peopleLocalesBySlug = new Map<string, Set<string>>();

  articleData.forEach((article) => {
    const locales = getArticleAvailableLocales(article);
    if (!locales.length) return;

    addSlugLocales(categoryLocalesBySlug, article?.category?.slug, locales);

    const articleTags = Array.isArray(article?.article_tags)
      ? article.article_tags
      : [];
    articleTags.forEach((entry: any) => {
      addSlugLocales(tagLocalesBySlug, entry?.tag?.slug, locales);
    });

    const articlePeople = Array.isArray(article?.article_people)
      ? article.article_people
      : [];
    articlePeople.forEach((entry: any) => {
      addSlugLocales(peopleLocalesBySlug, entry?.person?.slug, locales);
    });
  });

  return {
    categoryLocalesBySlug,
    tagLocalesBySlug,
    peopleLocalesBySlug,
  };
}

export async function getAllDynamicRoutes(): Promise<string[]> {
  try {
    const [
      { data: profiles, error },
      articleData,
      categoryData,
      tagData,
      peopleData,
    ] =
      await Promise.all([
        getRegisteredUsersDisplaynames(),
        getAllPublishedArticlesWithTags(),
        getAllCategories(),
        getAllTags(),
        getAllPeopleSlugs(),
      ]);

    if (
      !profiles ||
      !articleData ||
      !categoryData ||
      !tagData ||
      !peopleData ||
      error
    ) {
      console.error("One or more data fetches failed.", { error });
      return [];
    }

    const profileRoutes = (
      await Promise.all(
        profiles
          .map(async (profile) => {
            const slug =
              profile.slug ||
              (await getUserSlugFromDisplayName(profile.displayname));

            if (!slug) return null;

            const gender = getGenderFromId(profile.gender_id) || "unknown";
            return `/profiles/${gender}/${slug}`;
          })
      )
    ).filter((route): route is string => Boolean(route));

    const articleRoutes = articleData.map((a) => ({
      path: `/articles/${a.slug}`,
      locales: getArticleAvailableLocales(a),
    }));
    const { categoryLocalesBySlug, tagLocalesBySlug, peopleLocalesBySlug } =
      buildTaxonomyLocalesBySlug(articleData);
    const categoryRoutes = categoryData
      .map((c) => ({
        path: `/categories/${c.slug}`,
        locales: getSlugLocales(categoryLocalesBySlug, c.slug),
      }))
      .filter((route) => route.locales.length > 0);
    const tagRoutes = tagData
      .map((t) => ({
        path: `/tags/${t.slug}`,
        locales: getSlugLocales(tagLocalesBySlug, t.slug),
      }))
      .filter((route) => route.locales.length > 0);
    const peopleRoutes = peopleData
      .map((p) => ({
        path: `/people/${p.slug}`,
        locales: getSlugLocales(peopleLocalesBySlug, p.slug),
      }))
      .filter((route) => route.locales.length > 0);

    const staticPages = ["/about", "/cookies", "/people"];
    const homeRoutes = ["/"];

    const allRoutes = [
      ...homeRoutes,
      ...staticPages,
      ...profileRoutes,
    ];

    const localizedRoutes = allRoutes.flatMap((route) =>
      SUPPORTED_LOCALES.map((locale) => localizePath(route, locale))
    );

    const localizedTaxonomyRoutes = [...categoryRoutes, ...tagRoutes, ...peopleRoutes]
      .flatMap((route) => route.locales.map((locale) => localizePath(route.path, locale)));

    const localizedArticleRoutes = articleRoutes.flatMap((route) =>
      route.locales.map((locale) => localizePath(route.path, locale))
    );

    return [...new Set([...localizedRoutes, ...localizedTaxonomyRoutes, ...localizedArticleRoutes])];
  } catch (error) {
    console.error("Error fetching dynamic routes:", error);
    return [];
  }
}

/**
 * Returns dynamic routes in sitemap-compatible format.
 * Used for sitemap endpoint (loc + lastmod).
 */
export async function getAllDynamicRoutesWithMetadata(): Promise<
  { loc: string; lastmod: string; images?: { loc: string }[] }[]
> {
  try {
    const [
      { data: profiles, error },
      articleData,
      categoryData,
      tagData,
      peopleData,
    ] = await Promise.all([
      getRegisteredUsersDisplaynames(),
      getAllPublishedArticlesWithTags(),
      getAllCategories(),
      getAllTags(),
      getAllPeopleSlugs(),
    ]);

    if (
      !profiles ||
      !articleData ||
      !categoryData ||
      !tagData ||
      !peopleData ||
      error
    ) {
      console.error("One or more data fetches failed.", { error });
      return [];
    }

    const staticPages = ["/about", "/cookies", "/people"];
    const homeRoutes = ["/"];
    const fallbackLastmod = new Date().toISOString();

    const localizedRoutes: {
      loc: string;
      lastmod: string;
      images?: { loc: string }[];
    }[] = [];

    const addLocalizedRoutes = (
      route: string,
      lastmod?: string,
      images?: { loc: string }[]
    ) => {
      SUPPORTED_LOCALES.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(route, locale),
          lastmod: lastmod || fallbackLastmod,
          images,
        });
      });
    };

    homeRoutes.forEach((route) => addLocalizedRoutes(route));
    staticPages.forEach((route) => addLocalizedRoutes(route));

    const profileRoutes = (
      await Promise.all(
        profiles
          .map(async (profile) => {
            const slug =
              profile.slug ||
              (await getUserSlugFromDisplayName(profile.displayname));

            if (!slug) return null;

            const gender = getGenderFromId(profile.gender_id) || "unknown";
            return `/profiles/${gender}/${slug}`;
          })
      )
    ).filter((route): route is string => Boolean(route));

    profileRoutes.forEach((route) => addLocalizedRoutes(route));

    articleData.forEach((article) => {
      const imageUrl = buildArticleImageUrl(article?.image_path);
      const localizedArticlePath = `/articles/${article.slug}`;
      const locales = getArticleAvailableLocales(article);
      locales.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(localizedArticlePath, locale),
          lastmod: article?.created_at || fallbackLastmod,
          images: imageUrl ? [{ loc: imageUrl }] : undefined,
        });
      });
    });

    const { categoryLocalesBySlug, tagLocalesBySlug, peopleLocalesBySlug } =
      buildTaxonomyLocalesBySlug(articleData);

    categoryData.forEach((category) => {
      const locales = getSlugLocales(categoryLocalesBySlug, category.slug);
      locales.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(`/categories/${category.slug}`, locale),
          lastmod: fallbackLastmod,
        });
      });
    });
    tagData.forEach((tag) => {
      const locales = getSlugLocales(tagLocalesBySlug, tag.slug);
      locales.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(`/tags/${tag.slug}`, locale),
          lastmod: fallbackLastmod,
        });
      });
    });
    peopleData.forEach((person) => {
      const locales = getSlugLocales(peopleLocalesBySlug, person.slug);
      locales.forEach((locale) => {
        localizedRoutes.push({
          loc: localizePath(`/people/${person.slug}`, locale),
          lastmod: fallbackLastmod,
        });
      });
    });

    const deduped = new Map<string, { loc: string; lastmod: string; images?: { loc: string }[] }>();
    localizedRoutes.forEach((route) => {
      if (!deduped.has(route.loc)) {
        deduped.set(route.loc, route);
      }
    });

    return Array.from(deduped.values());
  } catch (error) {
    console.error("Error fetching dynamic routes:", error);
    return [];
  }
}
