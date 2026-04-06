import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function getRegisteredUsersDisplaynames(options?: {
  onlyAI?: boolean;
  includePrivate?: boolean;
  minAgeDays?: number;
}) {
  const query = supabase
    .from("profiles")
    .select(
      "displayname, gender_id, slug, is_ai, is_private, bio, tagline, avatar_url, preferred_locale, created, profile_translations(locale)"
    );

  if (options?.onlyAI) {
    query.eq("is_ai", true);
  }

  if (!options?.includePrivate) {
    query.eq("is_private", false);
  }

  if (options?.minAgeDays) {
    const cutoff = new Date(Date.now() - options.minAgeDays * 24 * 60 * 60 * 1000).toISOString();
    query.lt("created", cutoff);
  }

  return await query;
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

export async function getPublishedSeoPageRoutes() {
  const { data, error } = await supabase
    .from("seo_pages")
    .select("page_type, locale, slug, updated_at")
    .eq("is_published", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("Error fetching SEO page routes:", error.message);
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

export async function getFaqTopicSlugs(): Promise<
  { slug: string; updatedAt: string }[]
> {
  const { data, error } = await supabase
    .from("faq_topics")
    .select("slug, updated_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching FAQ topic slugs:", error.message);
    return [];
  }

  const seen = new Set<string>();
  return (data || [])
    .filter((row) => {
      const slug = String(row.slug || "").trim();
      if (!slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    })
    .map((row) => ({
      slug: String(row.slug).trim(),
      updatedAt: row.updated_at || new Date().toISOString(),
    }));
}
