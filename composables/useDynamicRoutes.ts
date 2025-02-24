// composables/useDynamicRoutes.ts
import { createClient } from "@supabase/supabase-js";

// Function to fetch dynamic routes from Supabase
export async function getAllDynamicRoutes() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("avatar_url", "")
      .neq("provider", "anonymous");

    if (error) {
      console.error("Error fetching profiles:", error);
      return []; // Return an empty array in case of error
    }

    const routes = profiles.map((profile) => `/profiles/${profile.user_id}`);
    // console.log("Fetched dynamic routes:", routes);
    return routes; // Ensure an array is always returned
  } catch (error) {
    console.error("Error fetching profiles for prerendering:", error);
    return []; // Always return an empty array on error
  }
}