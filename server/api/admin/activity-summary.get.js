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
    const userId = String(query.user_id || "");
    const threadSampleLimit = Math.min(Number(query.thread_sample_limit || 200), 500);
    const voteSampleLimit = Math.min(Number(query.vote_sample_limit || 200), 500);

    if (!userId) {
      setResponseStatus(event, 400);
      return { error: { stage: "query", message: "user_id required" } };
    }

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
      console.error("[admin/activity-summary] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const [
      { count: chatCount, error: chatCountError },
      { count: discussionCount, error: discussionCountError },
      { data: chatLast, error: chatLastError },
      { data: discussionRows, error: discussionRowsError },
    ] = await Promise.all([
      supa
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("sender_id", userId),
      supa
        .from("messages_v2")
        .select("id", { count: "exact", head: true })
        .eq("sender_user_id", userId),
      supa
        .from("messages")
        .select("created_at")
        .eq("sender_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supa
        .from("messages_v2")
        .select("id, thread_id, created_at")
        .eq("sender_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(threadSampleLimit),
    ]);

    if (
      chatCountError ||
      discussionCountError ||
      chatLastError ||
      discussionRowsError
    ) {
      const error =
        chatCountError ||
        discussionCountError ||
        chatLastError ||
        discussionRowsError;
      console.error("[admin/activity-summary] query error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "counts", message: error.message } };
    }

    const threadCounts = new Map();
    const messageIds = [];
    const threadIds = new Set();

    (discussionRows || []).forEach((row) => {
      if (row?.thread_id) {
        threadCounts.set(
          row.thread_id,
          (threadCounts.get(row.thread_id) || 0) + 1
        );
        threadIds.add(row.thread_id);
      }
      if (row?.id) messageIds.push(row.id);
    });

    let threads = [];
    if (threadIds.size) {
      const { data: threadRows, error: threadsError } = await supa
        .from("threads")
        .select("id, title, slug, article_id")
        .in("id", Array.from(threadIds));
      if (threadsError) {
        console.error(
          "[admin/activity-summary] threads error:",
          threadsError
        );
      } else {
        let articleSlugById = new Map();
        const articleIds = Array.from(
          new Set((threadRows || []).map((t) => t.article_id).filter(Boolean))
        );
        if (articleIds.length) {
          const { data: articleRows, error: articlesError } = await supa
            .from("articles")
            .select("id, slug")
            .in("id", articleIds);
          if (articlesError) {
            console.error(
              "[admin/activity-summary] articles error:",
              articlesError
            );
          } else {
            articleSlugById = new Map(
              (articleRows || []).map((a) => [a.id, a.slug || null])
            );
          }
        }

        threads = (threadRows || []).map((thread) => ({
          id: thread.id,
          title: thread.title,
          slug: thread.slug,
          article_slug: articleSlugById.get(thread.article_id) || null,
          messageCount: threadCounts.get(thread.id) || 0,
        }));
        threads.sort((a, b) => b.messageCount - a.messageCount);
      }
    }

    let discussionUpvotes = 0;
    let discussionDownvotes = 0;
    const voteIds = messageIds.slice(0, voteSampleLimit);
    if (voteIds.length) {
      const { data: scoreRows, error: scoreError } = await supa
        .from("message_scores")
        .select("message_id, upvotes, downvotes")
        .in("message_id", voteIds);
      if (scoreError) {
        console.error(
          "[admin/activity-summary] message_scores error:",
          scoreError
        );
      } else {
        (scoreRows || []).forEach((row) => {
          discussionUpvotes += Number(row.upvotes || 0);
          discussionDownvotes += Number(row.downvotes || 0);
        });
      }
    }

    return {
      data: {
        chatCount: chatCount || 0,
        discussionCount: discussionCount || 0,
        chatLastAt: chatLast?.created_at || null,
        discussionLastAt: discussionRows?.[0]?.created_at || null,
        discussionThreads: threads,
        discussionSampleSize: discussionRows?.length || 0,
        discussionUpvotes,
        discussionDownvotes,
        voteSampleSize: voteIds.length,
      },
    };
  } catch (err) {
    console.error("[admin/activity-summary] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
