// composables/useDynamicRoutes.ts

import
  {
    getRegisteredUsersDisplaynames,
    getAllPublishedArticlesWithTags,
    getAllCategories,
    getAllTags,
    getUserSlugFromDisplayName
  } from "../lib/supabaseHelpers";
import { getGenderFromId } from "../lib/dbUtils";

export async function getAllDynamicRoutes() {
  try {
    const { data: profiles, error } = await getRegisteredUsersDisplaynames();
    const articleData = await getAllPublishedArticlesWithTags();
    const categoryData = await getAllCategories();
    const tagData = await getAllTags();


    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    const profileRoutes = await Promise.all(
      profiles.map(async (profile) =>
      {
        const slug = await getUserSlugFromDisplayName(profile.displayname);
        const gender = getGenderFromId(profile.gender_id);
        return `/profiles/${gender}/${slug}`;
      })
    ) ?? [];

    const articleRoutes =
      articleData?.map((article) => `/articles/${article.slug}`) ?? [];

    const categoryRoutes =
      categoryData?.map((cat) => `/categories/${cat.slug}`) ?? [];

    const tagRoutes =
      tagData?.map((tag) => `/tags/${tag.slug}`) ?? [];


    return [...profileRoutes, ...articleRoutes, ...categoryRoutes, ...tagRoutes];
  } catch (error) {
    console.error("Error fetching profiles for prerendering:", error);
    return [];
  }
}
