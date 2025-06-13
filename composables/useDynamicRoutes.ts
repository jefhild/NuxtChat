import {
  getRegisteredUsersDisplaynames,
  getAllPublishedArticlesWithTags,
  getAllCategories,
  getAllTags,
  getUserSlugFromDisplayName,
} from "../lib/supabaseHelpers";
import { getGenderFromId } from "../lib/dbUtils";

/**
 * Returns an array of dynamic route strings.
 * Used for Nitro prerendering (must return string[]).
 */
const SUPPORTED_LOCALES = ["en", "fr", "ru", "zh"];
// const SUPPORTED_LOCALES = ["en", "fr", "zh"];

export async function getAllDynamicRoutes(): Promise<string[]> {
  try {
    const [{ data: profiles, error }, articleData, categoryData, tagData] =
      await Promise.all([
        getRegisteredUsersDisplaynames(),
        getAllPublishedArticlesWithTags(),
        getAllCategories(),
        getAllTags(),
      ]);

    if (!profiles || !articleData || !categoryData || !tagData || error) {
      console.error("One or more data fetches failed.", { error });
      return [];
    }

    const profileRoutes = await Promise.all(
      profiles.map(async (profile) => {
        const slug = await getUserSlugFromDisplayName(profile.displayname);
        const gender = getGenderFromId(profile.gender_id) || "unknown";
        return `/profiles/${gender}/${slug}`;
      })
    );

    const articleRoutes = articleData.map((a) => `/articles/${a.slug}`);
    const categoryRoutes = categoryData.map((c) => `/categories/${c.slug}`);
    const tagRoutes = tagData.map((t) => `/tags/${t.slug}`);

    const allRoutes = [
      ...profileRoutes,
      ...articleRoutes,
      ...categoryRoutes,
      ...tagRoutes,
    ];

    // Now prefix each route with each locale
    const localizedRoutes = allRoutes.flatMap((route) =>
      SUPPORTED_LOCALES.map((locale) => `/${locale}${route}`)
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
