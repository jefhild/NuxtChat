import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function getRegisteredUsersDisplaynames(options?: {
  onlyAI?: boolean;
  includePrivate?: boolean;
}) {
  const query = supabase
    .from("profiles")
    .select("displayname, gender_id, slug, is_ai, is_private");

  if (options?.onlyAI) {
    query.eq("is_ai", true);
  }

  if (!options?.includePrivate) {
    query.eq("is_private", false);
  }

  return await query;
}

export async function getAllPublishedArticlesWithTags() {
  // Keep this query minimal; dynamic route building only needs slugs.
  const { data, error } = await supabase
    .from("articles")
    .select(
      "slug, created_at, image_path, original_language_code, article_translations(locale)"
    )
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching article slugs:", error.message);
    return [];
  }

  return data;
}

export async function getAllCategories()
{
  const {data} = await supabase
    .from("categories")
    .select("slug")
    .order("name", { ascending: true });
  
  return data;
}

export async function getAllTags()
{
  const {data} = await supabase
    .from("tags")
    .select("slug")
    .order("name", { ascending: true });

  return data;
}

export async function getAllPeopleSlugs() {
  const { data, error } = await supabase
    .from("people")
    .select("slug")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching people slugs:", error.message);
    return [];
  }

  return data;
}

export async function getUserSlugFromDisplayName(displayName: string){
  const { data, error } = await supabase
    .from("profiles")
    .select("slug")
    .eq("displayname", displayName)
    .maybeSingle();

  if (error)
  {
    console.error("Error fetching user slug:", error);
  }
  
  return data?.slug;
}
