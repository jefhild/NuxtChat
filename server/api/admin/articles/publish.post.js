// server/api/admin/articles/publish.post.js
export default defineEventHandler(async (event) => {
  try {
    // 1) Read body first
    const body = await readBody(event);
    const {
      articleId,
      title,
      botLabel,
      botAvatarUrl,
      summary = "",
      points = [],
      tags = [],
      rules = ["be respectful", "stay on topic"],
      overrides = {},
    } = body || {};

    if (!articleId || !title) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing articleId or title" };
    }

    // 2) Build Supabase server client lazily INSIDE the handler
    //    (avoid any top-level imports that might evaluate Nuxt composables)
    const { useDb } = await import("@/composables/useDB");
    const { getServerClientFrom } = useDb();

    // Read runtime config INSIDE the handler
    const cfg = useRuntimeConfig(event);
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    // 3) Insert or upsert thread
    const bot_context = {
      summary,
      points,
      tags,
      canonical_url: null,
      rules,
    };

    const threadInsert = {
      kind: "article",
      article_id: articleId,
      title,
      bot_label: botLabel || "Topic Agent",
      bot_avatar_url: botAvatarUrl || null,
      bot_context,
      // you can add agent_preset_id/version if you use them
      agent_overrides: overrides,
    };

    const { data: thread, error: tErr } = await supa
      .from("threads")
      .insert(threadInsert)
      .select("id")
      .single();

    if (tErr) {
      // If you want publish to be idempotent, switch to upsert(...) and .eq('article_id', articleId)
      console.error("[publish] insert thread error:", tErr);
      setResponseStatus(event, 500);
      return { success: false, error: tErr.message };
    }

    return { success: true, threadId: thread.id };
  } catch (e) {
    // If anything throws, return 500 (so you see the error) instead of letting Nitro drop the route.
    console.error("[publish] handler error:", e);
    setResponseStatus(event, 500);
    return { success: false, error: String(e?.message || e) };
  }
});
