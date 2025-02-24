import { createClient } from "@supabase/supabase-js";

export default defineEventHandler(async (event) => {
  // Manually initialize the Supabase client using your environment variables

  const config = useRuntimeConfig();
  const supabaseUrl = config.public.SUPABASE_URL;
  const supabaseAnonKey = config.public.SUPABASE_KEY;

  console.log("supabaseUrl", supabaseUrl);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Hi Supabase URL and Anon Key must be set in environment variables"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch profiles from Supabase
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("user_id")
    .neq("avatar_url", "");

  if (error) {
    console.error("Error fetching profiles:", error);
    return {
      status: 500,
      body: {
        error: "Failed to fetch profiles",
      },
    };
  }

  // Map profiles to sitemap URL entries
  const urls = profiles.map((profile) => ({
    loc: `/profiles/${profile.user_id}`,
    lastmod: new Date().toISOString(),
    changefreq: "daily",
    priority: 0.8,
  }));

  return urls;
});
