import { getRegisteredUsersIds } from "../lib/supabaseHelpers"; 

export async function getAllDynamicRoutes() {
  try {
    const { data: profiles, error } = await getRegisteredUsersIds();

    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    return profiles?.map((profile) => `/profiles/${profile.user_id}`) ?? [];
  } catch (error) {
    console.error("Error fetching profiles for prerendering:", error);
    return [];
  }
}
