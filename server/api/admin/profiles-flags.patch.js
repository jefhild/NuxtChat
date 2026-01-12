import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const body = (await readBody(event)) || {};
    const targetId = String(body?.user_id || "");
    if (!targetId) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "user_id required" } };
    }

    const updates = {};
    if (typeof body.force_online === "boolean") {
      updates.force_online = body.force_online;
    }
    if (typeof body.is_simulated === "boolean") {
      updates.is_simulated = body.is_simulated;
    }

    if (!Object.keys(updates).length) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "no valid fields provided" } };
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
      console.error("[admin/profiles-flags] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data, error } = await supa
      .from("profiles")
      .update(updates)
      .eq("user_id", targetId)
      .select("user_id, force_online, is_simulated")
      .maybeSingle();

    if (error) {
      console.error("[admin/profiles-flags] update error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "update", message: error.message } };
    }

    return { item: data };
  } catch (err) {
    console.error("[admin/profiles-flags] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
