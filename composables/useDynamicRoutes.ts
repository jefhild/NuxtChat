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
    const categoryRoutes = categoryData.map((c) => `/categories/${c.slug}`);
    const tagRoutes = tagData.map((t) => `/tags/${t.slug}`);
    const peopleRoutes = peopleData.map((p) => `/people/${p.slug}`);

    const staticPages = ["/about", "/cookies", "/people"];
    const homeRoutes = ["/"];

    const allRoutes = [
      ...homeRoutes,
      ...staticPages,
      ...profileRoutes,
      ...categoryRoutes,
      ...tagRoutes,
      ...peopleRoutes,
    ];

    const localizedRoutes = allRoutes.flatMap((route) =>
      SUPPORTED_LOCALES.map((locale) => localizePath(route, locale))
    );

    const localizedArticleRoutes = articleRoutes.flatMap((route) =>
      route.locales.map((locale) => localizePath(route.path, locale))
    );

    return [...localizedRoutes, ...localizedArticleRoutes];
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

    categoryData.forEach((category) =>
      addLocalizedRoutes(`/categories/${category.slug}`)
    );
    tagData.forEach((tag) => addLocalizedRoutes(`/tags/${tag.slug}`));
    peopleData.forEach((person) =>
      addLocalizedRoutes(`/people/${person.slug}`)
    );

    return localizedRoutes;
  } catch (error) {
    console.error("Error fetching dynamic routes:", error);
    return [];
  }
}
