import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const PHOTO_BUCKET = "profile-image-library";

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
      console.error("[admin/profile-photos.delete] admin check error:", meErr);
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

    const { data: photo, error: fetchError } = await supa
      .from("profile_photos")
      .select("id, storage_path")
      .eq("id", photoId)
      .single();

    if (fetchError || !photo) {
      setResponseStatus(event, 404);
      return { error: { stage: "fetch", message: "Photo not found" } };
    }

    const paths = photo.storage_path ? [photo.storage_path] : [];
    if (paths.length) {
      const { error: removeError } = await supa.storage
        .from(PHOTO_BUCKET)
        .remove(paths);
      if (removeError) {
        console.error("[admin/profile-photos.delete] storage remove error:", removeError);
        setResponseStatus(event, 500);
        return {
          error: { stage: "storage_remove", message: removeError.message },
        };
      }
    }

    const { error: deleteError } = await supa
      .from("profile_photos")
      .delete()
      .eq("id", photoId);

    if (deleteError) {
      console.error("[admin/profile-photos.delete] delete error:", deleteError);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: deleteError.message } };
    }

    return { success: true };
  } catch (err) {
    console.error("[admin/profile-photos.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
