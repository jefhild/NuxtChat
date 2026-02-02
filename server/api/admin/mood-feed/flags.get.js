import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const fetchAdminClient = (event) => {
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  return getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );
};

const ensureAdmin = async (supa, userId, event, label) => {
  const { data: me, error: meErr } = await supa
    .from("profiles")
    .select("is_admin")
    .eq("user_id", userId)
    .single();

  if (meErr) {
    console.error(`[admin/${label}] admin check error:`, meErr);
    setResponseStatus(event, 500);
    return { error: { stage: "admin_check", message: meErr.message } };
  }

  if (!me?.is_admin) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  return null;
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.flags"
    );
    if (adminError) return adminError;

    const { data: flags, error } = await supa
      .from("mood_feed_flags")
      .select(
        `
        id,
        target_type,
        target_id,
        reason,
        created_at,
        reporter:profiles!mood_feed_flags_user_id_fkey (
          user_id,
          displayname,
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin/mood-feed.flags] flags load error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "flags", message: error.message } };
    }

    const entryIds = (flags || [])
      .filter((flag) => flag.target_type === "entry")
      .map((flag) => flag.target_id);

    const replyIds = (flags || [])
      .filter((flag) => flag.target_type === "reply")
      .map((flag) => flag.target_id);

    let entries = [];
    let replies = [];

    if (entryIds.length) {
      const { data: entryData, error: entryErr } = await supa
        .from("mood_feed_entries")
        .select(
          `
          id,
          user_id,
          original_text,
          refined_text,
          prompt_text,
          created_at,
          profile:profiles!mood_feed_entries_user_id_fkey (
            user_id,
            displayname,
            avatar_url
          )
        `
        )
        .in("id", entryIds);

      if (entryErr) {
        console.error("[admin/mood-feed.flags] entries load error:", entryErr);
        setResponseStatus(event, 500);
        return { error: { stage: "entries", message: entryErr.message } };
      }

      entries = entryData || [];
    }

    if (replyIds.length) {
      const { data: replyData, error: replyErr } = await supa
        .from("mood_feed_replies")
        .select(
          `
          id,
          entry_id,
          user_id,
          content,
          created_at,
          profile:profiles!mood_feed_replies_user_id_fkey (
            user_id,
            displayname,
            avatar_url
          )
        `
        )
        .in("id", replyIds);

      if (replyErr) {
        console.error("[admin/mood-feed.flags] replies load error:", replyErr);
        setResponseStatus(event, 500);
        return { error: { stage: "replies", message: replyErr.message } };
      }

      replies = replyData || [];
    }

    const entryMap = new Map(entries.map((entry) => [entry.id, entry]));
    const replyMap = new Map(replies.map((reply) => [reply.id, reply]));

    const enriched = (flags || []).map((flag) => {
      if (flag.target_type === "entry") {
        const entry = entryMap.get(flag.target_id);
        return {
          ...flag,
          target: entry
            ? {
                type: "entry",
                id: entry.id,
                content: entry.refined_text || entry.original_text || "",
                prompt_text: entry.prompt_text || null,
                created_at: entry.created_at,
                author: entry.profile || null,
              }
            : { missing: true },
        };
      }

      const reply = replyMap.get(flag.target_id);
      return {
        ...flag,
        target: reply
          ? {
              type: "reply",
              id: reply.id,
              content: reply.content,
              entry_id: reply.entry_id,
              created_at: reply.created_at,
              author: reply.profile || null,
            }
          : { missing: true },
      };
    });

    return { flags: enriched };
  } catch (err) {
    console.error("[admin/mood-feed.flags] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
