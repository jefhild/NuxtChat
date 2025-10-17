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
  const { data: threads, error: threadsErr } = await supa
    .from("threads")
    .select("id, title, slug, bot_avatar_url, last_activity_at")
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


  // 3) Scores per thread — not implemented yet; stub zeros
 const scores = {}; // TODO: implement when thread votes go live

  // 4) Shape response
  return list.map((t) => ({
    id: t.id,
    title: t.title,
    botAvatarUrl: t.bot_avatar_url,
    lastActivityAt: t.last_activity_at,
    slug: t.slug,
    todayCount: todayCounts[t.id] || 0,
    score: scores[t.id] || 0,
  }));
});
