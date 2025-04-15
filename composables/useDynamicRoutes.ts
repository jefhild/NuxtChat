import { getRegisteredUsersDisplaynames } from "../lib/supabaseHelpers"; 

export async function getAllDynamicRoutes() {
  try {
    const { data: profiles, error } = await getRegisteredUsersDisplaynames();

    if (error) {
      console.error("Error fetching profiles:", error);
      return [];
    }

    const { getGenderFromId } = useDb();
    return profiles?.map((profile) => `/profiles/${getGenderFromId(profile.gender_id)}/${profile.displayname}`) ?? [];
  } catch (error) {
    console.error("Error fetching profiles for prerendering:", error);
    return [];
  }
}
