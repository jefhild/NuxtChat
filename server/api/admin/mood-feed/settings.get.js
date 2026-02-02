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
      "mood-feed.settings"
    );
    if (adminError) return adminError;

    let { data, error } = await supa
      .from("mood_feed_settings")
      .select("id, default_tone, updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      console.error("[admin/mood-feed.settings] load error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "load", message: error.message } };
    }

    if (!data) {
      const { data: seeded, error: seedErr } = await supa
        .from("mood_feed_settings")
        .insert({ id: 1, default_tone: "funny" })
        .select("id, default_tone, updated_at")
        .maybeSingle();

      if (seedErr) {
        console.error("[admin/mood-feed.settings] seed error:", seedErr);
        setResponseStatus(event, 500);
        return { error: { stage: "seed", message: seedErr.message } };
      }
      data = seeded;
    }

    return { item: data };
  } catch (err) {
    console.error("[admin/mood-feed.settings] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
