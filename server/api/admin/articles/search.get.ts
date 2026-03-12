import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const q = String(query.q || "").trim();
    const limit = Math.min(Math.max(Number(query.limit || 20), 1), 50);

    const supabase = await getServiceRoleClient(event);

    let request = supabase
      .from("articles")
      .select(
        `
          id,
          title,
          slug,
          is_published,
          created_at,
          article_tags(tag:tag_id(id, name, slug)),
          article_people(person:person_id(id, name, slug))
        `
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (q) {
      request = request.ilike("title", `%${q}%`);
    }

    const { data, error } = await request;
    if (error) throw error;

    const articles = (data || []).map((article: any) => ({
      id: article.id,
      title: article.title,
      slug: article.slug,
      is_published: article.is_published,
      created_at: article.created_at,
      tags: Array.isArray(article.article_tags)
        ? article.article_tags.map((row: any) => row.tag).filter(Boolean)
        : [],
      people: Array.isArray(article.article_people)
        ? article.article_people.map((row: any) => row.person).filter(Boolean)
        : [],
    }));

    return { success: true, articles };
  } catch (error: any) {
    console.error("[admin/articles/search] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.message || "Unable to search articles.",
      articles: [],
    };
  }
});
