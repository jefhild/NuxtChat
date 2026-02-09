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
      "mood-feed.moderation"
    );
    if (adminError) return adminError;

    const [entriesRes, repliesRes] = await Promise.all([
      supa
        .from("mood_feed_entries")
        .select(
          [
            "id",
            "user_id",
            "prompt_key",
            "prompt_text",
            "original_text",
            "refined_text",
            "source_locale",
            "status",
            "created_at",
            "profiles (user_id, displayname, avatar_url)",
          ].join(",")
        )
        .eq("status", "pending_validation")
        .order("created_at", { ascending: false }),
      supa
        .from("mood_feed_replies")
        .select(
          [
            "id",
            "entry_id",
            "reply_to_id",
            "user_id",
            "content",
            "source_locale",
            "status",
            "created_at",
            "profiles (user_id, displayname, avatar_url)",
            "mood_feed_entries (prompt_text, prompt_key, refined_text)",
          ].join(",")
        )
        .eq("status", "pending_validation")
        .order("created_at", { ascending: false }),
    ]);

    if (entriesRes.error) {
      setResponseStatus(event, 500);
      return { error: { stage: "entries", message: entriesRes.error.message } };
    }
    if (repliesRes.error) {
      setResponseStatus(event, 500);
      return { error: { stage: "replies", message: repliesRes.error.message } };
    }

    return {
      entries: entriesRes.data || [],
      replies: repliesRes.data || [],
    };
  } catch (err) {
    console.error("[admin/mood-feed.moderation] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
