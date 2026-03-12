import { getServiceRoleClient } from "~/server/utils/aiBots";

type TaxonomyKind = "categories" | "tags" | "people";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const kind = String(query.kind || "").trim() as TaxonomyKind;
    const publishedOnly =
      String(query.publishedOnly || "").trim() === "1" ||
      String(query.publishedOnly || "").trim().toLowerCase() === "true";

    if (!["categories", "tags", "people"].includes(kind)) {
      setResponseStatus(event, 400);
      return { success: false, error: "Invalid taxonomy kind." };
    }

    const supabase = await getServiceRoleClient(event);
    let counts: Record<string, number> = {};

    if (kind === "categories") {
      let request = supabase
        .from("articles")
        .select("category_id")
        .not("category_id", "is", null);

      if (publishedOnly) {
        request = request.eq("is_published", true);
      }

      const { data, error } = await request;
      if (error) throw error;

      counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
        const id = String(row?.category_id || "").trim();
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
    }

    if (kind === "tags") {
      let request = supabase.from("article_tags").select("tag_id");

      if (publishedOnly) {
        request = supabase
          .from("article_tags")
          .select("tag_id, articles!inner(is_published)")
          .eq("articles.is_published", true);
      }

      const { data, error } = await request;
      if (error) throw error;

      counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
        const id = String(row?.tag_id || "").trim();
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
    }

    if (kind === "people") {
      let request = supabase.from("article_people").select("person_id");

      if (publishedOnly) {
        request = supabase
          .from("article_people")
          .select("person_id, articles!inner(is_published)")
          .eq("articles.is_published", true);
      }

      const { data, error } = await request;
      if (error) throw error;

      counts = (data || []).reduce((acc: Record<string, number>, row: any) => {
        const id = String(row?.person_id || "").trim();
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});
    }

    return { success: true, counts };
  } catch (error: any) {
    console.error("[admin/taxonomy/counts] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.message || "Unable to load taxonomy counts.",
      counts: {},
    };
  }
});
