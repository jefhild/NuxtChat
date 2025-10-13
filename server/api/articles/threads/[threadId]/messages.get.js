// server/api/articles/threads/[threadId]/messages.get.js
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const threadId = getRouterParam(event, "threadId");
  const q = getQuery(event);
  const limit = Math.min(Number(q.limit || 50), 200);
  const before = q.before ? new Date(String(q.before)) : null;

  // 👇 DO NOT fail if there is no session
  let viewerId = null;
  try {
    const viewer = await serverSupabaseUser(event);
    viewerId = viewer?.id || null;
  } catch {
    viewerId = null;
  }

  // 1) fetch raw messages
  let msgQuery = supa
    .from("messages_v2")
    .select(
      "id, thread_id, author_id:sender_user_id, reply_to_message_id, sender_kind, content, created_at, visible, deleted"
    )
    .eq("thread_id", threadId)
    .eq("visible", true)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (before) msgQuery = msgQuery.lt("created_at", before.toISOString());

  const { data: msgs, error: msgErr } = await msgQuery;
  if (msgErr) {
    setResponseStatus(event, 500);
    return { success: false, error: msgErr.message };
  }

  // ids needed
  const authorIds = [...new Set(msgs.map((m) => m.author_id).filter(Boolean))];
  const messageIds = msgs.map((m) => m.id);

  // 2) profiles (by user_id)
  let profilesMap = {};
  if (authorIds.length) {
    const { data: profs, error: pErr } = await supa
      .from("profiles")
      .select("user_id, displayname, avatar_url")
      .in("user_id", authorIds);
    if (!pErr && Array.isArray(profs)) {
      profilesMap = Object.fromEntries(
        profs.map((p) => [
          p.user_id,
          {
            displayname: p.displayname || "User",
            avatarUrl: p.avatar_url || null,
          },
        ])
      );
    }
  }

  // 3) votes aggregate (score) and myVote
  // Assuming your 'votes' has: target_type ('message'|'thread'), target_id, user_id, value (-1|1)
  let scoreMap = {},
    myVoteMap = {};
  if (messageIds.length) {
    // total score per message
    const { data: scores } = await supa
      .from("votes")
      .select("target_id, value")
      .eq("target_type", "message")
      .in("target_id", messageIds);
    if (Array.isArray(scores)) {
      for (const r of scores) {
        scoreMap[r.target_id] =
          (scoreMap[r.target_id] || 0) + (Number(r.value) || 0);
      }
    }

    if (viewerId) {
      const { data: myVotes } = await supa
        .from("votes")
        .select("target_id, value")
        .eq("target_type", "message")
        .eq("user_id", viewerId)
        .in("target_id", messageIds);
      if (Array.isArray(myVotes)) {
        for (const r of myVotes) myVoteMap[r.target_id] = Number(r.value) || 0;
      }
    }
  }

  // 4) shape view objects
  const view = msgs.map((m) => {
    const prof = profilesMap[m.author_id] || {
      displayname: "User",
      avatarUrl: null,
    };
    return {
      id: m.id,
      threadId: m.thread_id,
      authorId: m.author_id,
      replyToMessageId: m.reply_to_message_id,
      senderKind: m.sender_kind || "user",
      content: m.content,
      createdAt: m.created_at,
      displayname: prof.displayname,
      avatarUrl: prof.avatarUrl,
      score: scoreMap[m.id] || 0,
      myVote: myVoteMap[m.id] || 0,
      masked: !m.visible ? true : false,
      deleted: !!m.deleted,
    };
  });

  // return newest→oldest (we already sorted desc)
  return { success: true, items: view };
});
