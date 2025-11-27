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

function localizePath(path: string, locale: string) {
  return locale === defaultLocale ? path : `/${locale}${path}`;
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
        getRegisteredUsersDisplaynames({ onlyAI: true }),
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
          .filter((profile) => profile.is_ai)
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
  { loc: string; lastmod: string }[]
> {
  const routes = await getAllDynamicRoutes();

  return routes.map((route) => ({
    loc: route,
    lastmod: new Date().toISOString(),
  }));
}
