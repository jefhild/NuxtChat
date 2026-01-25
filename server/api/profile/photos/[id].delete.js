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

    if (user.is_anonymous) {
      setResponseStatus(event, 403);
      return { error: "Registered users only" };
    }

    const photoId = String(getRouterParam(event, "id") || "");
    if (!photoId) {
      setResponseStatus(event, 400);
      return { error: { stage: "params", message: "id required" } };
    }

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: photo, error: fetchError } = await supa
      .from("profile_photos")
      .select("id, storage_path")
      .eq("id", photoId)
      .eq("user_id", user.id)
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
        console.error("[profile/photos.delete] storage remove error:", removeError);
        setResponseStatus(event, 500);
        return {
          error: { stage: "storage_remove", message: removeError.message },
        };
      }
    }

    const { error: deleteError } = await supa
      .from("profile_photos")
      .delete()
      .eq("id", photoId)
      .eq("user_id", user.id);

    if (deleteError) {
      console.error("[profile/photos.delete] delete error:", deleteError);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: deleteError.message } };
    }

    return { success: true };
  } catch (err) {
    console.error("[profile/photos.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
