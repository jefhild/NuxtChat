import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const ALLOWED_STATUSES = new Set([
  "published",
  "pending_validation",
  "rejected",
]);

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

    const entryId = getRouterParam(event, "id");
    if (!entryId) {
      setResponseStatus(event, 400);
      return { error: "Missing entry id" };
    }

    const body = (await readBody(event)) || {};
    const status = String(body.status || "").trim().toLowerCase();
    if (!ALLOWED_STATUSES.has(status)) {
      setResponseStatus(event, 400);
      return { error: "Invalid status" };
    }

    const supa = fetchAdminClient(event);
    const adminError = await ensureAdmin(
      supa,
      user.id,
      event,
      "mood-feed.entries.patch"
    );
    if (adminError) return adminError;

    const { data, error } = await supa
      .from("mood_feed_entries")
      .update({ status })
      .eq("id", entryId)
      .select("id, status")
      .maybeSingle();

    if (error) {
      setResponseStatus(event, 500);
      return { error: error.message };
    }

    return { item: data || null };
  } catch (err) {
    console.error("[admin/mood-feed.entries.patch] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
