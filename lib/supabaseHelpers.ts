import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

export async function getRegisteredUsersDisplaynames() {
  return await supabase.from("profiles").select("displayname, gender_id");
}

export async function getAllPublishedArticlesWithTags()
{
  const { data, error } = await supabase
      .from("articles")
      .select(`
      id,
      title,
      type,
      slug,
      content,
      is_published,
      created_at,
      category:category_id(name),
      article_tags(tag:tag_id(name))
    `)
      .eq("is_published", true)
      .order("created_at", { ascending: false });

    if (error)
    {
      console.error("Error fetching articles:", error.message);
      return [];
    }

    // Flatten tags and category
    return data.map((article :any) => ({
      ...article,
      category_name: article.category?.name ?? "Uncategorized",
      tags: (article.article_tags as { tag: { name: string } }[]).map(t => t.tag.name)
    }));
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



