// server/api/articles/threads/[threadId]/messages.get.js
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const threadId = getRouterParam(event, "threadId");
  if (!threadId)
    throw createError({ statusCode: 400, statusMessage: "threadId required" });

  // user is OPTIONAL; no throwing here
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

  // 1) Base messages
  const { data: msgs, error: mErr } = await supa
    .from("messages_v2")
    .select(
      "id, thread_id, reply_to_message_id, sender_kind, content, created_at, sender_user_id, deleted"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (mErr) throw createError({ statusCode: 500, statusMessage: mErr.message });
  if (!msgs?.length) return { items: [] };

  const msgIds = msgs.map((m) => m.id);
  const authorIds = Array.from(
    new Set(msgs.map((m) => m.sender_user_id).filter(Boolean))
  );

  // 2) Aggregates
  const [{ data: scores, error: sErr }, { data: todays, error: tErr }] =
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
  if (tErr) throw createError({ statusCode: 500, statusMessage: tErr.message });

  // 3) Profiles (by user_id) — no auth required, service role reads it
  let profMap = new Map();
  if (authorIds.length) {
    const { data: profs, error: pErr } = await supa
      .from("profiles") // adjust table name if different
      .select("user_id, displayname, avatar_url")
      .in("user_id", authorIds);
    if (pErr)
      throw createError({ statusCode: 500, statusMessage: pErr.message });
    profMap = new Map((profs || []).map((p) => [p.user_id, p]));
  }

  // 4) Current user votes (only if logged in)
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
  const scoreMap = new Map(scores.map((r) => [r.message_id, r]));
  const todayMap = new Map(todays.map((r) => [r.message_id, r.today]));
  const myMap = new Map(myVotes.map((r) => [r.message_id, r.value]));

  const items = msgs.map((m) => {
    const prof = profMap.get(m.sender_user_id) || {};
    return {
      id: m.id,
      replyToMessageId: m.reply_to_message_id,
      senderKind: m.sender_kind,
      content: m.content,
      createdAt: m.created_at,
      authorId: m.sender_user_id,
      displayname: prof.displayname ?? null, // <- restored
      avatarUrl: prof.avatar_url ?? null, // <- restored
      masked: m.masked,
      deleted: m.deleted,
      score: scoreMap.get(m.id)?.score ?? 0,
      upvotes: scoreMap.get(m.id)?.upvotes ?? 0,
      downvotes: scoreMap.get(m.id)?.downvotes ?? 0,
      today: todayMap.get(m.id) ?? 0,
      myVote: user?.id ? myMap.get(m.id) ?? 0 : 0,
    };
  });

  return { items };
});
