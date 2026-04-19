import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const PAGE_SIZE = 1000;
const DELETE_CHUNK_SIZE = 100;

const applyMessageFilter = (query, filter) => {
  let next = query;
  for (const [column, value] of Object.entries(filter)) {
    next = next.eq(column, value);
  }
  return next;
};

const fetchMatchingMessageIds = async (supa, filters) => {
  const ids = new Set();

  for (const filter of filters) {
    let from = 0;

    while (true) {
      const query = applyMessageFilter(
        supa
          .from("messages")
          .select("id")
          .order("id", { ascending: true })
          .range(from, from + PAGE_SIZE - 1),
        filter
      );
      const { data, error } = await query;

      if (error) {
        return { error };
      }

      const rows = Array.isArray(data) ? data : [];
      rows.forEach((row) => {
        if (row?.id) ids.add(row.id);
      });

      if (rows.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }

  return { ids: Array.from(ids) };
};

const deleteMessageIds = async (supa, ids) => {
  let deleted = 0;

  for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE);
    const { error, count } = await supa
      .from("messages")
      .delete({ count: "exact" })
      .in("id", chunk);

    if (error) {
      return { error };
    }

    deleted += count ?? chunk.length;
  }

  return { deleted };
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const body = (await readBody(event)) || {};
    const targetUserId = String(body.user_id || "").trim();
    const peerId = String(body.peer_id || "").trim();
    if (!targetUserId) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "user_id required" } };
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
      console.error("[admin/messages-delete] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const filters = peerId
      ? [
          { sender_id: targetUserId, receiver_id: peerId },
          { sender_id: peerId, receiver_id: targetUserId },
        ]
      : [{ sender_id: targetUserId }, { receiver_id: targetUserId }];

    const matched = await fetchMatchingMessageIds(supa, filters);
    if (matched.error) {
      console.error("[admin/messages-delete] fetch ids error:", matched.error);
      setResponseStatus(event, 500);
      return {
        error: { stage: "fetch_ids", message: matched.error.message },
      };
    }

    let deleted = 0;
    if (matched.ids.length) {
      const result = await deleteMessageIds(supa, matched.ids);
      if (result.error) {
        console.error("[admin/messages-delete] delete error:", result.error);
        setResponseStatus(event, 500);
        return { error: { stage: "delete", message: result.error.message } };
      }
      deleted = result.deleted;
    }

    const remaining = await fetchMatchingMessageIds(supa, filters);
    if (remaining.error) {
      console.error("[admin/messages-delete] verify error:", remaining.error);
      setResponseStatus(event, 500);
      return {
        error: { stage: "verify", message: remaining.error.message },
      };
    }

    if (remaining.ids.length) {
      setResponseStatus(event, 409);
      return {
        error: {
          stage: "verify",
          message: `${remaining.ids.length} messages still match after delete.`,
        },
        deleted,
        matched: matched.ids.length,
        remaining: remaining.ids.length,
      };
    }

    return {
      ok: true,
      deleted,
      matched: matched.ids.length,
      remaining: 0,
    };
  } catch (err) {
    console.error("[admin/messages-delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
