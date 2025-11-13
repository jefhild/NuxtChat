import { getServiceRoleClient } from "~/server/utils/aiBots";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(Number.isFinite(value) ? value : min, min), max);

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const page = clamp(Number(query.page) || 1, 1, 10_000);
  const pageSize = clamp(Number(query.pageSize) || 20, 5, 100);
  const offset = (page - 1) * pageSize;

  const stream = Array.isArray(query.stream)
    ? String(query.stream[0] || "")
    : String(query.stream || "");
  const status = Array.isArray(query.status)
    ? String(query.status[0] || "")
    : String(query.status || "");
  const search = Array.isArray(query.search)
    ? String(query.search[0] || "").trim()
    : String(query.search || "").trim();

  try {
    const supabase = await getServiceRoleClient(event);
    let builder = supabase
      .from("newsmesh_union_view")
      .select(
        `
        stream,
        id,
        article_id,
        title,
        description,
        link,
        link_hash,
        media_url,
        published_date,
        source,
        category,
        topics,
        people,
        first_seen_at,
        last_seen_at,
        seen_count,
        batch_id,
        image_status,
        status,
        licensing_notes
      `,
        { count: "exact" }
      );

    if (stream && stream !== "all") {
      builder = builder.eq("stream", stream);
    }

    if (status && status !== "all") {
      builder = builder.eq("status", status);
    }

    if (search) {
      const normalizedSearch = search.replace(/,/g, " ").trim();
      const likeSearch = `%${normalizedSearch.replace(/%/g, "\\%")}%`;
      builder = builder.or(
        [
          `title.ilike.${likeSearch}`,
          `description.ilike.${likeSearch}`,
          `source.ilike.${likeSearch}`,
          `category.ilike.${likeSearch}`,
        ].join(",")
      );
    }

    const { data, error, count } = await builder
      .order("published_date", { ascending: false, nullsFirst: true })
      .order("last_seen_at", { ascending: false, nullsFirst: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    return {
      success: true,
      data: data ?? [],
      meta: {
        page,
        pageSize,
        total: count ?? 0,
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/newsmesh] fetch error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error: err?.message || "Unable to load Newsmesh articles",
    };
  }
});
