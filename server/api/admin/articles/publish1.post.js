// server/api/admin/articles/publish.post.js
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {

  console.log("[publish] module loaded");
  const body = await readBody(event);
  const {
    articleId, // required (uuid)
    title, // optional; falls back to article.title
    botLabel = "Topic Agent",
    botAvatarUrl, // optional; default from article.image_path if present
    summary, // optional; trimmed to 500
    points = [], // optional string[] (3–7 recommended)
    tags = [], // optional string[]
    rules = ["be respectful", "stay on topic"], // optional
    overrides = { lull_minutes: 8, reply_cooldown_seconds: 120 }, // optional
  } = body || {};

  if (!articleId) {
    setResponseStatus(event, 400);
    return { success: false, error: "Missing articleId" };
  }

  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { success: false, error: "Unauthorized" };
  }

  // admin-gate via profiles.is_admin (adjust field if different)
  const { getServerClientFrom } = useDb();
  const cfg = useRuntimeConfig();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: me } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (!me?.is_admin) {
    setResponseStatus(event, 403);
    return { success: false, error: "Forbidden" };
  }

  // Pull article to fill defaults
  const { data: art, error: artErr } = await supa
    .from("articles")
    .select("id, title, image_path, slug, tags")
    .eq("id", articleId)
    .single();

  if (artErr || !art) {
    setResponseStatus(event, 404);
    return { success: false, error: "Article not found" };
  }

  const resolvedTitle = title || art.title;
  const resolvedAvatar =
    botAvatarUrl ||
    (art.image_path
      ? `${cfg.public.SUPABASE_BUCKET}/articles/${art.image_path}`
      : null);

  // Build bot_context jsonb (keep ≤500 for summary)
  const trim = (s, n = 500) => (s || "").toString().slice(0, n);
  const bot_context = {
    summary: trim(summary),
    points: Array.isArray(points) ? points : [],
    tags:
      Array.isArray(tags) && tags.length
        ? tags
        : Array.isArray(art.tags)
        ? art.tags
        : [],
    canonical_url: `${cfg.public.SITE_URL}/articles/${art.slug}`,
    rules: Array.isArray(rules) ? rules : [],
  };

  // Upsert thread row
  const upsertPayload = {
    kind: "article",
    article_id: art.id,
    title: resolvedTitle,
    bot_label: botLabel,
    bot_avatar_url: resolvedAvatar,
    bot_context,
    agent_overrides: overrides || {},
    published: true,
  };

  const { data: thread, error: upErr } = await supa
    .from("threads")
    .upsert(upsertPayload, { onConflict: "article_id" })
    .select("id")
    .single();

  if (upErr) {
    setResponseStatus(event, 500);
    return { success: false, error: upErr.message };
  }

  return { success: true, threadId: thread.id };
});
