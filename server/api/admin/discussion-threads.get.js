import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const query = getQuery(event);
    const limit = Math.min(Math.max(Number(query.limit || 300), 1), 500);

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: me, error: meErr } = await supa
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (meErr) {
      console.error("[admin/discussion-threads] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data: threads, error: threadsErr } = await supa
      .from("threads")
      .select("id, slug, title, article_id, created_at")
      .eq("kind", "article")
      .eq("published", true)
      .not("article_id", "is", null)
      .limit(limit);

    if (threadsErr) {
      console.error("[admin/discussion-threads] threads error:", threadsErr);
      setResponseStatus(event, 500);
      return { error: { stage: "threads", message: threadsErr.message } };
    }

    const items = Array.isArray(threads) ? threads : [];
    const articleIds = Array.from(
      new Set(items.map((t) => t.article_id).filter(Boolean))
    );

    let articleById = new Map();
    if (articleIds.length) {
      const { data: articles, error: articlesErr } = await supa
        .from("articles")
        .select("id, slug, title, created_at")
        .in("id", articleIds);
      if (articlesErr) {
        console.error("[admin/discussion-threads] articles error:", articlesErr);
      } else {
        articleById = new Map((articles || []).map((a) => [a.id, a]));
      }
    }

    const enriched = items
      .map((thread) => {
        const article = articleById.get(thread.article_id) || null;
        return {
          id: thread.id,
          slug: thread.slug || null,
          title: thread.title || article?.title || null,
          created_at: thread.created_at || null,
          article_id: thread.article_id || null,
          article_slug: article?.slug || null,
          article_title: article?.title || null,
          article_created_at: article?.created_at || null,
        };
      })
      .sort((a, b) => {
        const aTs = new Date(a.article_created_at || a.created_at || 0).getTime();
        const bTs = new Date(b.article_created_at || b.created_at || 0).getTime();
        return bTs - aTs;
      });

    return { items: enriched };
  } catch (err) {
    console.error("[admin/discussion-threads] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
