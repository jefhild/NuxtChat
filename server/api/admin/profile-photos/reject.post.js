import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
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
      console.error("[admin/profile-photos.reject] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const body = (await readBody(event)) || {};
    const photoId = String(body.photoId || "");
    if (!photoId) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "photoId required" } };
    }

    const { data, error } = await supa
      .from("profile_photos")
      .update({ status: "rejected" })
      .eq("id", photoId)
      .select("id, user_id, status")
      .single();

    if (error) {
      console.error("[admin/profile-photos.reject] update error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "update", message: error.message } };
    }

    return { photo: data };
  } catch (err) {
    console.error("[admin/profile-photos.reject] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
