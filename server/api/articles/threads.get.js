// server/api/articles/threads.get.js
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  // query params: order=latest|oldest|pinned (default latest), limit (default 50)
  const q = getQuery(event);
  const order = ["latest", "oldest", "pinned"].includes(
    String(q.order || "").toLowerCase()
  )
    ? String(q.order).toLowerCase()
    : "latest";
  const limit = Math.min(Number(q.limit || 50), 200);

  // 1) Load threads (no reliance on a `pinned` column)
  const ascending = order === "oldest";
  // const { data: threads, error: threadsErr } = await supa
  //   .from("threads")
  //   .select("id, title, slug, bot_avatar_url, last_activity_at")






    const { data: threads, error: threadsErr } = await supa
    .from("threads")
    .select(`
      id,
      title,
      slug,
      bot_avatar_url,
      last_activity_at,
      article:articles (
        id,
        slug,
        title,
        image_path,
        content
      )
    `)
    .eq("kind", "article")
    .order("last_activity_at", { ascending })
    .limit(limit);

  if (threadsErr) {
    console.error("[threads.get] threadsErr:", threadsErr);
    throw createError({ statusCode: 500, statusMessage: threadsErr.message });
  }
  if (!threads?.length) return [];

  // Optionally float a specific thread first when order=pinned
  // Set this in your nuxt config/env if you want: public.DEFAULT_PINNED_THREAD_ID
  const defaultPinnedId = cfg.public?.DEFAULT_PINNED_THREAD_ID || null;
  let list = threads.slice();
  if (order === "pinned" && defaultPinnedId) {
    list.sort((a, b) =>
      a.id === defaultPinnedId ? -1 : b.id === defaultPinnedId ? 1 : 0
    );
  }

  const threadIds = list.map((t) => t.id);

  // 2) Today counts
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  let todayCounts = {};
  try {
    const { data: todayRows, error: todayErr } = await supa
      .from("messages_v2")
      .select("thread_id")
      .in("thread_id", threadIds)
      .gte("created_at", startOfDay.toISOString())
      .eq("visible", true);

    if (todayErr) throw todayErr;
    for (const r of todayRows || []) {
      todayCounts[r.thread_id] = (todayCounts[r.thread_id] || 0) + 1;
    }
  } catch (e) {
    console.error("[threads.get] todayCounts error:", e);
    todayCounts = {};
  }

  // 3) Total message counts + upvote totals
  let messageCounts = {};
  let upvoteCounts = {};
  const messageIds = [];
  const threadByMessageId = new Map();
  try {
    const { data: countRows, error: countErr } = await supa
      .from("messages_v2")
      .select("id, thread_id")
      .in("thread_id", threadIds)
      .eq("visible", true);

    if (countErr) throw countErr;
    for (const r of countRows || []) {
      messageCounts[r.thread_id] = (messageCounts[r.thread_id] || 0) + 1;
      if (r?.id) {
        messageIds.push(r.id);
        threadByMessageId.set(r.id, r.thread_id);
      }
    }
  } catch (e) {
    console.error("[threads.get] messageCounts error:", e);
    messageCounts = {};
  }

  if (messageIds.length) {
    try {
      const { data: voteRows, error: voteErr } = await supa
        .from("message_scores")
        .select("message_id, upvotes")
        .in("message_id", messageIds);
      if (voteErr) throw voteErr;
      for (const r of voteRows || []) {
        const threadId = threadByMessageId.get(r.message_id);
        if (!threadId) continue;
        upvoteCounts[threadId] =
          (upvoteCounts[threadId] || 0) + Number(r.upvotes || 0);
      }
    } catch (e) {
      console.error("[threads.get] upvoteCounts error:", e);
      upvoteCounts = {};
    }
  }


  // 4) Scores per thread — not implemented yet; stub zeros
 const scores = {}; // TODO: implement when thread votes go live

  // 5) Shape response
  return list.map((t) => ({
    id: t.id,
    title: t.title,
    botAvatarUrl: t.bot_avatar_url,
    lastActivityAt: t.last_activity_at,
    slug: t.slug,
    todayCount: todayCounts[t.id] || 0,
    messageCount: messageCounts[t.id] || 0,
    upvoteCount: upvoteCounts[t.id] || 0,
    score: scores[t.id] || 0,
        article: t.article
      ? {
          id: t.article.id,
          slug: t.article.slug,
          title: t.article.title,
          imagePath: t.article.image_path,
          content: t.article.content,
        }
      : null,
  }));
});
