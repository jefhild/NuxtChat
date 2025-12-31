import { useDb } from "@/composables/useDB";

const uniqBy = (items, keyFn) => {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const userId = String(q.userId || q.id || "").trim() || null;
  const slug = String(q.slug || "").trim() || null;
  if (!userId && !slug) {
    throw createError({ statusCode: 400, statusMessage: "userId or slug required" });
  }

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const profileQuery = supa
    .from("profiles")
    .select("user_id, slug, last_active, is_ai")
    .limit(1);
  const { data: profile, error: profileErr } = userId
    ? await profileQuery.eq("user_id", userId).maybeSingle()
    : await profileQuery.eq("slug", slug).maybeSingle();

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message });
  }
  if (!profile?.user_id) {
    throw createError({ statusCode: 404, statusMessage: "Profile not found" });
  }

  const uid = profile.user_id;
  const isAi = Boolean(profile.is_ai);

  let personaIds = [];
  let personaKeys = [];
  if (isAi) {
    const { data: personas, error: personasErr } = await supa
      .from("ai_personas")
      .select("id, persona_key")
      .eq("profile_user_id", uid);
    if (personasErr) {
      throw createError({ statusCode: 500, statusMessage: personasErr.message });
    }
    personaIds = (personas || []).map((p) => p.id).filter(Boolean);
    personaKeys = (personas || []).map((p) => p.persona_key).filter(Boolean);
  }

  let commentCount = 0;
  let recentMsgs = [];
  if (isAi && personaIds.length === 0 && personaKeys.length === 0) {
    commentCount = 0;
    recentMsgs = [];
  } else {
    const applyCommentsFilter = (query) => {
      if (!isAi) {
        return query.eq("sender_user_id", uid);
      }
      let q = query.eq("sender_kind", "bot");
      if (personaIds.length && personaKeys.length) {
        q = q.or(
          `meta->>persona_id.in.(${personaIds.join(",")}),meta->>persona_key.in.(${personaKeys.join(",")})`
        );
      } else if (personaIds.length) {
        q = q.in("meta->>persona_id", personaIds);
      } else if (personaKeys.length) {
        q = q.in("meta->>persona_key", personaKeys);
      }
      return q;
    };

    const [
      { count, error: commentCountErr },
      { data, error: recentMsgsErr },
    ] = await Promise.all([
      applyCommentsFilter(
        supa.from("messages_v2").select("id", { count: "exact", head: true })
      ),
      applyCommentsFilter(
        supa
          .from("messages_v2")
          .select("id, thread_id, created_at")
          .order("created_at", { ascending: false })
          .limit(50)
      ),
    ]);

    if (commentCountErr || recentMsgsErr) {
      const error = commentCountErr || recentMsgsErr;
      throw createError({ statusCode: 500, statusMessage: error.message });
    }

    commentCount = count || 0;
    recentMsgs = data || [];
  }

  const threadOrder = [];
  const threadLastById = new Map();
  for (const row of recentMsgs || []) {
    if (!row?.thread_id) continue;
    if (!threadLastById.has(row.thread_id)) {
      threadOrder.push(row.thread_id);
      threadLastById.set(row.thread_id, row.created_at || null);
    }
  }

  let commentItems = [];
  if (threadOrder.length) {
    const { data: threads, error: threadsErr } = await supa
      .from("threads")
      .select("id, title, slug")
      .in("id", threadOrder.slice(0, 12));
    if (threadsErr) {
      throw createError({ statusCode: 500, statusMessage: threadsErr.message });
    }
    const threadMap = new Map((threads || []).map((t) => [t.id, t]));
    commentItems = threadOrder
      .map((threadId) => {
        const thread = threadMap.get(threadId);
        if (!thread) return null;
        return {
          id: `thread-${thread.id}`,
          title: thread.title || "Untitled discussion",
          slug: thread.slug || null,
          createdAt: threadLastById.get(threadId) || null,
        };
      })
      .filter(Boolean)
      .slice(0, 4);
  }

  const [
    { count: upvoteCount, error: upvoteCountErr },
    { data: recentVotes, error: recentVotesErr },
  ] = await Promise.all([
    supa
      .from("votes_unified")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("value", 1)
      .in("target_type", ["article", "thread"]),
    supa
      .from("votes_unified")
      .select("target_type, target_id, created_at")
      .eq("user_id", uid)
      .eq("value", 1)
      .in("target_type", ["article", "thread"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (upvoteCountErr || recentVotesErr) {
    const error = upvoteCountErr || recentVotesErr;
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const uniqueVotes = uniqBy(recentVotes || [], (row) =>
    `${row?.target_type}:${row?.target_id}`
  );
  const threadVoteIds = uniqueVotes
    .filter((row) => row?.target_type === "thread")
    .map((row) => row.target_id);
  const articleVoteIds = uniqueVotes
    .filter((row) => row?.target_type === "article")
    .map((row) => row.target_id);

  const [{ data: threadRows, error: threadRowsErr }, { data: articleRows, error: articleRowsErr }, { data: threadByArticleRows, error: threadByArticleErr }] =
    await Promise.all([
      threadVoteIds.length
        ? supa.from("threads").select("id, title, slug").in("id", threadVoteIds)
        : Promise.resolve({ data: [], error: null }),
      articleVoteIds.length
        ? supa
            .from("articles")
            .select("id, title, slug")
            .in("id", articleVoteIds)
        : Promise.resolve({ data: [], error: null }),
      articleVoteIds.length
        ? supa
            .from("threads")
            .select("id, slug, article_id, title")
            .in("article_id", articleVoteIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

  if (threadRowsErr || articleRowsErr || threadByArticleErr) {
    const error = threadRowsErr || articleRowsErr || threadByArticleErr;
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const threadMap = new Map((threadRows || []).map((t) => [t.id, t]));
  const articleMap = new Map((articleRows || []).map((a) => [a.id, a]));
  const threadByArticleMap = new Map(
    (threadByArticleRows || []).map((t) => [t.article_id, t])
  );

  const upvoteItems = uniqueVotes
    .map((vote) => {
      if (!vote?.target_id || !vote?.target_type) return null;
      if (vote.target_type === "thread") {
        const thread = threadMap.get(vote.target_id);
        if (!thread) return null;
        return {
          id: `thread-${thread.id}`,
          type: "thread",
          title: thread.title || "Untitled discussion",
          slug: thread.slug || null,
          createdAt: vote.created_at || null,
        };
      }
      const article = articleMap.get(vote.target_id);
      if (!article) return null;
      const thread = threadByArticleMap.get(article.id);
      return {
        id: `article-${article.id}`,
        type: "article",
        title: article.title || "Untitled article",
        slug: thread?.slug || article.slug || null,
        createdAt: vote.created_at || null,
      };
    })
    .filter(Boolean)
    .slice(0, 4);

  return {
    userId: uid,
    lastActive: profile.last_active ?? null,
    comments: {
      count: commentCount || 0,
      items: commentItems,
    },
    upvotes: {
      count: upvoteCount || 0,
      items: upvoteItems,
    },
  };
});
