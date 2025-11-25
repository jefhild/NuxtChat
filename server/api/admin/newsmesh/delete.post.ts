import { getServiceRoleClient } from "~/server/utils/aiBots";

const MAX_DELETE = 200;
const STREAM_TABLES: Record<string, string> = {
  trending: "newsmesh_trending",
  latest: "newsmesh_latest",
};

const missingTableMessage = (table: string) =>
  `Missing table "${table}". Ensure the Newsmesh source tables are present (expected tables: ${Object.values(
    STREAM_TABLES
  ).join(", ")}).`;

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleIds = Array.isArray(body.articleIds)
      ? Array.from(
          new Set(
            body.articleIds
              .map((id: unknown) => (typeof id === "string" ? id.trim() : ""))
              .filter(Boolean)
          )
        )
      : [];

    if (!articleIds.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Select at least one article to delete." };
    }

    if (articleIds.length > MAX_DELETE) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error: `You can delete up to ${MAX_DELETE} articles at once.`,
      };
    }

    const supabase = await getServiceRoleClient(event);
    const { data: rows, error: fetchError } = await supabase
      .from("newsmesh_union_view")
      .select("id, stream")
      .in("id", articleIds);

    if (fetchError) throw fetchError;

    const toDeleteByTable: Record<string, string[]> = {};
    (rows || []).forEach((row) => {
      const streamKey = String(row.stream || "").toLowerCase();
      const table = STREAM_TABLES[streamKey];
      if (!table) return;
      if (!toDeleteByTable[table]) toDeleteByTable[table] = [];
      toDeleteByTable[table].push(row.id);
    });

    if (!Object.keys(toDeleteByTable).length) {
      setResponseStatus(event, 404);
      return {
        success: false,
        error: "No matching Newsmesh records found to delete.",
      };
    }

    const deletedIds: string[] = [];

    for (const [table, ids] of Object.entries(toDeleteByTable)) {
      if (!ids.length) continue;
      const { data, error } = await supabase
        .from(table)
        .delete()
        .in("id", ids)
        .select("id");

      if (error) {
        if (String(error?.code) === "42P01") {
          throw new Error(missingTableMessage(table));
        }
        throw error;
      }

      deletedIds.push(...(data || []).map((row) => row.id));
    }

    return {
      success: true,
      data: {
        deletedIds,
        count: deletedIds.length,
        tables: Object.keys(toDeleteByTable),
      },
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/newsmesh] delete error:", err);
    setResponseStatus(event, 500);
    return {
      success: false,
      error:
        err?.message ||
        err?.details ||
        "Unable to delete the selected articles right now.",
    };
  }
});
