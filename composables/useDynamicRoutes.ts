// composables/useDynamicRoutes.ts
import { createClient } from "@supabase/supabase-js";

// Function to fetch dynamic routes from Supabase
export async function getAllDynamicRoutes() {
  const { getRegisteredUsersIds } = useDb();

  try {
    const { data: profiles, error } = await getRegisteredUsersIds();

    if (error) {
      console.error("Error fetching profiles:", error);
      return []; // Return an empty array in case of error
    }

    const routes = profiles ? profiles.map((profile) => `/profiles/${profile.user_id}`) : [];
    // console.log("Fetched dynamic routes:", routes);
    return routes; // Ensure an array is always returned
  } catch (error) {
    console.error("Error fetching profiles for prerendering:", error);
    return []; // Always return an empty array on error
  }
}