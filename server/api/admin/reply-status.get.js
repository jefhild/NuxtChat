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
    const rawIds = String(query.user_ids || "");
    const userIds = rawIds
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (!userIds.length) {
      return { items: {} };
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
      console.error("[admin/reply-status] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data: inboundRows, error: inboundError } = await supa
      .from("messages")
      .select("receiver_id, sender_id, created_at")
      .in("receiver_id", userIds);

    if (inboundError) {
      console.error("[admin/reply-status] inbound error:", inboundError);
      setResponseStatus(event, 500);
      return { error: { stage: "inbound", message: inboundError.message } };
    }

    const lastInboundByPair = new Map();
    const senderIds = new Set();

    (inboundRows || []).forEach((row) => {
      if (!row?.receiver_id || !row?.sender_id || !row?.created_at) return;
      const key = `${row.receiver_id}|${row.sender_id}`;
      const existing = lastInboundByPair.get(key);
      if (!existing || row.created_at > existing) {
        lastInboundByPair.set(key, row.created_at);
      }
      senderIds.add(row.sender_id);
    });

    const statusByUserId = Object.fromEntries(
      userIds.map((id) => [id, false])
    );

    if (!lastInboundByPair.size) {
      return { items: statusByUserId };
    }

    const { data: outboundRows, error: outboundError } = await supa
      .from("messages")
      .select("sender_id, receiver_id, created_at")
      .in("sender_id", userIds)
      .in("receiver_id", Array.from(senderIds));

    if (outboundError) {
      console.error("[admin/reply-status] outbound error:", outboundError);
      setResponseStatus(event, 500);
      return { error: { stage: "outbound", message: outboundError.message } };
    }

    const lastOutboundByPair = new Map();
    (outboundRows || []).forEach((row) => {
      if (!row?.sender_id || !row?.receiver_id || !row?.created_at) return;
      const key = `${row.sender_id}|${row.receiver_id}`;
      const existing = lastOutboundByPair.get(key);
      if (!existing || row.created_at > existing) {
        lastOutboundByPair.set(key, row.created_at);
      }
    });

    for (const [pairKey, inboundAt] of lastInboundByPair.entries()) {
      const [receiverId, senderId] = pairKey.split("|");
      const outboundAt = lastOutboundByPair.get(`${receiverId}|${senderId}`) || null;
      if (!outboundAt || outboundAt < inboundAt) {
        statusByUserId[receiverId] = true;
      }
    }

    return { items: statusByUserId };
  } catch (err) {
    console.error("[admin/reply-status] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
