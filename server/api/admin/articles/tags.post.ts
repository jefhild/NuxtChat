import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const tagIds = Array.isArray(body.tagIds) ? body.tagIds : [];
    const tagNames = Array.isArray(body.tagNames) ? body.tagNames : [];

    if (!articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "articleId is required." };
    }

    const supabase = await getServiceRoleClient(event);

    const slugify = (value = "") =>
      String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const normalizedNames = tagNames
      .map((name) => String(name || "").trim())
      .filter((name) => name);
    const uniqueNames = Array.from(new Set(normalizedNames));
    const uniqueSlugs = uniqueNames.map((name) => slugify(name));

    let resolvedTagIds = Array.isArray(tagIds) ? tagIds.slice() : [];

    if (uniqueNames.length) {
      const [{ data: byName, error: nameErr }, { data: bySlug, error: slugErr }] =
        await Promise.all([
          supabase.from("tags").select("id, name, slug").in("name", uniqueNames),
          supabase.from("tags").select("id, name, slug").in("slug", uniqueSlugs),
        ]);
      if (nameErr) throw nameErr;
      if (slugErr) throw slugErr;

      const existing = [...(byName || []), ...(bySlug || [])];
      const existingBySlug = new Set(existing.map((t) => t.slug));
      const missing = uniqueNames
        .map((name, idx) => ({
          name,
          slug: uniqueSlugs[idx],
        }))
        .filter((entry) => entry.slug && !existingBySlug.has(entry.slug));

      if (missing.length) {
        const { error: insertError } = await supabase
          .from("tags")
          .upsert(missing, { onConflict: "slug" });
        if (insertError) throw insertError;
      }

      const { data: resolved, error: resolveErr } = await supabase
        .from("tags")
        .select("id")
        .in("slug", uniqueSlugs);
      if (resolveErr) throw resolveErr;

      resolvedTagIds = resolvedTagIds.concat(
        (resolved || []).map((row) => row.id)
      );
    }

    const { error: deleteError } = await supabase
      .from("article_tags")
      .delete()
      .eq("article_id", articleId);
    if (deleteError) throw deleteError;

    const cleaned = Array.from(new Set(resolvedTagIds)).filter(Boolean);
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
