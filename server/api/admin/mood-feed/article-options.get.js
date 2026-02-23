import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const fetchAdminClient = (event) => {
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  return getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );
};

const ensureAdmin = async (supa, userId, event, label) => {
  const { data: me, error: meErr } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .single();

  if (meErr) {
    console.error(`[admin/${label}] admin check error:`, meErr);
    setResponseStatus(event, 500);
    return { error: { stage: "admin_check", message: meErr.message } };
  }

  if (!me?.is_admin) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  return null;
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.article-options"
    );
    if (adminError) return adminError;

    let data = null;
    let error = null;

    ({ data, error } = await supa
      .from("articles")
      .select("id, slug, title, is_published, created_at")
      .eq("is_published", true)
      .not("slug", "is", null)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(25));

    // Fallback: no is_published or created_at columns.
    if (
      error &&
      (String(error?.message || "").includes("is_published") ||
        String(error?.message || "").includes("created_at"))
    ) {
      ({ data, error } = await supa
        .from("articles")
        .select("id, slug, title")
        .not("slug", "is", null)
        .order("id", { ascending: false })
        .limit(25));
    }

    if (error) {
      console.error("[admin/mood-feed.article-options] load error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "load", message: error.message } };
    }

    const bySlug = new Map();
    for (const article of data || []) {
      const slug = String(article?.slug || "").trim();
      if (!slug || bySlug.has(slug)) continue;
      bySlug.set(slug, {
        slug,
        title: String(article?.title || "").trim() || slug,
      });
    }

    const items = Array.from(bySlug.values()).map((item) => ({
        slug: item.slug,
        title: item.title,
        label: `${item.title} (/articles/${item.slug})`,
      }));

    return { items };
  } catch (err) {
    console.error("[admin/mood-feed.article-options] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
