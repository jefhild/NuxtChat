// composables/useFetchProfiles.ts
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase client manually
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// This is your function to fetch profiles
export async function fetchProfiles() {
  try {
    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("user_id")
      .neq("avatar_url", "")
      .neq("provider", "anonymous");

    if (error) throw error;

    return profiles;
  } catch (error) {
    console.error("Error fetching profiles:", error);
    return [];
  }
}
