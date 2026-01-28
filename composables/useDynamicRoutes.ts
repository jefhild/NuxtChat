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

    const articleRoutes = articleData.map((a) => `/articles/${a.slug}`);
    const categoryRoutes = categoryData.map((c) => `/categories/${c.slug}`);
    const tagRoutes = tagData.map((t) => `/tags/${t.slug}`);
    const peopleRoutes = peopleData.map((p) => `/people/${p.slug}`);

    const staticPages = ["/about", "/cookies", "/settings", "/people"];
    const homeRoutes = ["/"];

    const allRoutes = [
      ...homeRoutes,
      ...staticPages,
      ...profileRoutes,
      ...articleRoutes,
      ...categoryRoutes,
      ...tagRoutes,
      ...peopleRoutes,
    ];

    const localizedRoutes = allRoutes.flatMap((route) =>
      SUPPORTED_LOCALES.map((locale) => localizePath(route, locale))
    );

    return localizedRoutes;
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

    const staticPages = ["/about", "/cookies", "/settings", "/people"];
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
      addLocalizedRoutes(
        `/articles/${article.slug}`,
        article?.created_at,
        imageUrl ? [{ loc: imageUrl }] : undefined
      );
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
