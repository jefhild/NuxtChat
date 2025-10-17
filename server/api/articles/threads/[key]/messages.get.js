import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const key = String(getRouterParam(event, "key") || "");
  if (!key)
    throw createError({ statusCode: 400, statusMessage: "key required" });

  // user is OPTIONAL
  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch {}

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  // 0) Resolve slug | id -> thread { id, slug, title }
  const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(key);
  const sel = "id, slug, title";
  const find = looksLikeUuid
    ? supa.from("threads").select(sel).eq("id", key).maybeSingle()
    : supa.from("threads").select(sel).eq("slug", key).maybeSingle();

  const { data: thread, error: tErr } = await find;
  if (tErr) throw createError({ statusCode: 500, statusMessage: tErr.message });
  if (!thread)
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });

  const threadId = thread.id;

  // 1) Base messages
  const { data: msgs, error: mErr } = await supa
    .from("messages_v2")
    .select(
      "id, thread_id, reply_to_message_id, sender_kind, content, created_at, sender_user_id, masked, deleted"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (mErr) throw createError({ statusCode: 500, statusMessage: mErr.message });

  // Short-circuit: still return thread meta even if no messages (helps UI/realtime)
  if (!msgs?.length) return { thread, items: [] };

  const msgIds = msgs.map((m) => m.id);
  const authorIds = Array.from(
    new Set(msgs.map((m) => m.sender_user_id).filter(Boolean))
  );

  // 2) Aggregates
  const [{ data: scores, error: sErr }, { data: todays, error: tErr2 }] =
    await Promise.all([
      supa
        .from("message_scores")
        .select("message_id, score, upvotes, downvotes")
        .in("message_id", msgIds),
      supa
        .from("message_scores_today")
        .select("message_id, today")
        .in("message_id", msgIds),
    ]);
  if (sErr) throw createError({ statusCode: 500, statusMessage: sErr.message });
  if (tErr2)
    throw createError({ statusCode: 500, statusMessage: tErr2.message });

  // 3) Profiles (by user_id)
  let profMap = new Map();
  if (authorIds.length) {
    const { data: profs, error: pErr } = await supa
      .from("profiles")
      .select("user_id, displayname, avatar_url")
      .in("user_id", authorIds);
    if (pErr)
      throw createError({ statusCode: 500, statusMessage: pErr.message });
    profMap = new Map((profs || []).map((p) => [p.user_id, p]));
  }

  // 4) Current user votes
  let myVotes = [];
  if (user?.id) {
    const { data, error } = await supa
      .from("votes_messages")
      .select("message_id, value")
      .eq("user_id", user.id)
      .in("message_id", msgIds);
    if (error)
      throw createError({ statusCode: 500, statusMessage: error.message });
    myVotes = data || [];
  }

  // 5) Merge
  const scoreMap = new Map((scores || []).map((r) => [r.message_id, r]));
  const todayMap = new Map((todays || []).map((r) => [r.message_id, r.today]));
  const myMap = new Map((myVotes || []).map((r) => [r.message_id, r.value]));

  const items = (msgs || []).map((m) => {
    const prof = profMap.get(m.sender_user_id) || {};
    const agg = scoreMap.get(m.id) || {};
    return {
      id: m.id,
      replyToMessageId: m.reply_to_message_id,
      senderKind: m.sender_kind,
      content: m.content,
      createdAt: m.created_at,
      authorId: m.sender_user_id,
      displayname: prof.displayname ?? null,
      avatarUrl: prof.avatar_url ?? null,
      masked: m.masked,
      deleted: m.deleted,
      score: agg.score ?? 0,
      upvotes: agg.upvotes ?? 0,
      downvotes: agg.downvotes ?? 0,
      today: todayMap.get(m.id) ?? 0,
      myVote: user?.id ? myMap.get(m.id) ?? 0 : 0,
    };
  });

  return { thread, items };
});
