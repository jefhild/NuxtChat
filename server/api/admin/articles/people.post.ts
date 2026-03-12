import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const personIds = Array.isArray(body.personIds) ? body.personIds : [];
    const personNames = Array.isArray(body.personNames) ? body.personNames : [];

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

    const normalizedNames = personNames
      .map((name) => String(name || "").trim())
      .filter((name) => name);
    const uniqueNames = Array.from(new Set(normalizedNames));
    const uniqueSlugs = uniqueNames.map((name) => slugify(name));

    let resolvedPersonIds = Array.isArray(personIds) ? personIds.slice() : [];

    if (uniqueNames.length) {
      const [{ data: byName, error: nameErr }, { data: bySlug, error: slugErr }] =
        await Promise.all([
          supabase.from("people").select("id, name, slug").in("name", uniqueNames),
          supabase.from("people").select("id, name, slug").in("slug", uniqueSlugs),
        ]);
      if (nameErr) throw nameErr;
      if (slugErr) throw slugErr;

      const existing = [...(byName || []), ...(bySlug || [])];
      const existingBySlug = new Set(existing.map((item) => item.slug));
      const missing = uniqueNames
        .map((name, idx) => ({
          name,
          slug: uniqueSlugs[idx],
        }))
        .filter((entry) => entry.slug && !existingBySlug.has(entry.slug));

      if (missing.length) {
        const { error: insertError } = await supabase
          .from("people")
          .upsert(missing, { onConflict: "slug" });
        if (insertError) throw insertError;
      }

      const { data: resolved, error: resolveErr } = await supabase
        .from("people")
        .select("id")
        .in("slug", uniqueSlugs);
      if (resolveErr) throw resolveErr;

      resolvedPersonIds = resolvedPersonIds.concat(
        (resolved || []).map((row) => row.id)
      );
    }

    const { error: deleteError } = await supabase
      .from("article_people")
      .delete()
      .eq("article_id", articleId);
    if (deleteError) throw deleteError;

    const cleaned = Array.from(new Set(resolvedPersonIds)).filter(Boolean);
    if (cleaned.length) {
      const rows = cleaned.map((personId) => ({
        article_id: articleId,
        person_id: personId,
      }));
      const { error: insertError } = await supabase
        .from("article_people")
        .insert(rows);
      if (insertError) throw insertError;
    }

    return { success: true };
  } catch (error: any) {
    console.error("[admin/articles/people] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.message || "Unable to update article people.",
    };
  }
});
