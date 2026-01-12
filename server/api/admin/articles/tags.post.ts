import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const tagIds = Array.isArray(body.tagIds) ? body.tagIds : [];

    if (!articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "articleId is required." };
    }

    const supabase = await getServiceRoleClient(event);

    const { error: deleteError } = await supabase
      .from("article_tags")
      .delete()
      .eq("article_id", articleId);
    if (deleteError) throw deleteError;

    const cleaned = tagIds.filter(Boolean);
    if (cleaned.length) {
      const rows = cleaned.map((tagId) => ({
        article_id: articleId,
        tag_id: tagId,
      }));
      const { error: insertError } = await supabase
        .from("article_tags")
        .insert(rows);
      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("[admin/articles/tags] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.message || "Unable to update article tags.",
    };
  }
});
