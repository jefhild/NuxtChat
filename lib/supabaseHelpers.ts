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
  { groupSlug: string; slug: string; updatedAt: string }[]
> {
  const [topicsResponse, entriesResponse] = await Promise.all([
    supabase
      .from("faq_topics")
      .select("id, group_id, slug, updated_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase
      .from("faq_entries")
      .select("topic_id, updated_at")
      .eq("is_active", true),
  ]);

  if (topicsResponse.error) {
    console.error("Error fetching FAQ topic slugs:", topicsResponse.error.message);
    return [];
  }

  if (entriesResponse.error) {
    console.error(
      "Error fetching FAQ entry metadata for sitemap:",
      entriesResponse.error.message
    );
    return [];
  }

  const { data: groupsData, error: groupsError } = await supabase
    .from("faq_groups")
    .select("id, slug")
    .eq("is_active", true);

  if (groupsError) {
    console.error("Error fetching FAQ group slugs:", groupsError.message);
    return [];
  }

  const groupSlugMap = new Map(
    (groupsData || []).map((group) => [
      String(group.id || "").trim(),
      String(group.slug || "").trim(),
    ])
  );

  const topicMeta = new Map<string, { count: number; updatedAt: string }>();
  (entriesResponse.data || []).forEach((row) => {
    const topicId = String(row.topic_id || "").trim();
    if (!topicId) return;
    const updatedAt = String(row.updated_at || "").trim();
    const existing = topicMeta.get(topicId);
    if (!existing) {
      topicMeta.set(topicId, { count: 1, updatedAt });
      return;
    }
    existing.count += 1;
    if (updatedAt && (!existing.updatedAt || updatedAt > existing.updatedAt)) {
      existing.updatedAt = updatedAt;
    }
  });

  const seen = new Set<string>();
  return (topicsResponse.data || [])
    .filter((row) => {
      const groupSlug = groupSlugMap.get(String(row.group_id || "").trim());
      const meta = topicMeta.get(String(row.id || "").trim());
      const slug = String(row.slug || "").trim();
      const key = `${groupSlug || ""}::${slug}`;
      if (!groupSlug || !slug || seen.has(key) || !meta?.count) return false;
      seen.add(key);
      return true;
    })
    .map((row) => ({
      groupSlug: groupSlugMap.get(String(row.group_id || "").trim()) || "",
      slug: String(row.slug).trim(),
      updatedAt:
        topicMeta.get(String(row.id || "").trim())?.updatedAt ||
        row.updated_at ||
        new Date().toISOString(),
    }));
}
