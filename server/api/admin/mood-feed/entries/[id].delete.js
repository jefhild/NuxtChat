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

    const entryId = String(event.context?.params?.id || "").trim();
    if (!entryId) {
      setResponseStatus(event, 400);
      return { error: "id required" };
    }

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.entries.delete"
    );
    if (adminError) return adminError;

    const { data, error } = await supa
      .from("mood_feed_entries")
      .delete()
      .eq("id", entryId)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("[admin/mood-feed.entries.delete] delete error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: error.message } };
    }

    if (!data?.id) {
      setResponseStatus(event, 404);
      return { error: "Entry not found" };
    }

    const { error: flagErr } = await supa
      .from("mood_feed_flags")
      .delete()
      .eq("target_type", "entry")
      .eq("target_id", entryId);

    if (flagErr) {
      console.error(
        "[admin/mood-feed.entries.delete] flag cleanup error:",
        flagErr
      );
    }

    return { ok: true, id: data.id };
  } catch (err) {
    console.error("[admin/mood-feed.entries.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
