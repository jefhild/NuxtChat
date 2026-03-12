import { getServiceRoleClient } from "~/server/utils/aiBots";

type TaxonomyKind = "categories" | "tags" | "people";

const PAGE_SIZE = 1000;

const reduceCounts = (rows: any[], key: string) =>
  (rows || []).reduce((acc: Record<string, number>, row: any) => {
    const id = String(row?.[key] || "").trim();
    if (!id) return acc;
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {});

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

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_taxonomy_counts",
      {
        p_kind: kind,
        p_published_only: publishedOnly,
      }
    );

    if (!rpcError) {
      counts = Object.fromEntries(
        (rpcData || [])
          .filter((row: any) => row?.taxonomy_id)
          .map((row: any) => [
            String(row.taxonomy_id),
            Number(row.article_count || 0),
          ])
      );
      return { success: true, counts };
    }

    console.warn("[admin/taxonomy/counts] rpc fallback:", rpcError);

    if (kind === "categories") {
      let from = 0;
      let batch: any[] = [];
      do {
        let request = supabase
          .from("articles")
          .select("category_id")
          .not("category_id", "is", null)
          .range(from, from + PAGE_SIZE - 1);

        if (publishedOnly) {
          request = request.eq("is_published", true);
        }

        const { data, error } = await request;
        if (error) throw error;
        batch = data || [];
        const batchCounts = reduceCounts(batch, "category_id");
        Object.entries(batchCounts).forEach(([id, count]) => {
          counts[id] = (counts[id] || 0) + count;
        });
        from += PAGE_SIZE;
      } while (batch.length === PAGE_SIZE);
    }

    if (kind === "tags") {
      let from = 0;
      let batch: any[] = [];
      do {
        let request = supabase
          .from("article_tags")
          .select(publishedOnly ? "tag_id, articles!inner(is_published)" : "tag_id")
          .range(from, from + PAGE_SIZE - 1);

        if (publishedOnly) {
          request = request.eq("articles.is_published", true);
        }

        const { data, error } = await request;
        if (error) throw error;
        batch = data || [];
        const batchCounts = reduceCounts(batch, "tag_id");
        Object.entries(batchCounts).forEach(([id, count]) => {
          counts[id] = (counts[id] || 0) + count;
        });
        from += PAGE_SIZE;
      } while (batch.length === PAGE_SIZE);
    }

    if (kind === "people") {
      let from = 0;
      let batch: any[] = [];
      do {
        let request = supabase
          .from("article_people")
          .select(
            publishedOnly ? "person_id, articles!inner(is_published)" : "person_id"
          )
          .range(from, from + PAGE_SIZE - 1);

        if (publishedOnly) {
          request = request.eq("articles.is_published", true);
        }

        const { data, error } = await request;
        if (error) throw error;
        batch = data || [];
        const batchCounts = reduceCounts(batch, "person_id");
        Object.entries(batchCounts).forEach(([id, count]) => {
          counts[id] = (counts[id] || 0) + count;
        });
        from += PAGE_SIZE;
      } while (batch.length === PAGE_SIZE);
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
