import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

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

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supa
      .from("profile_photos")
      .select("id, storage_path, public_url, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[profile/photos.get] list error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "list", message: error.message } };
    }

    const photos = [];

    for (const row of data || []) {
      let signedUrl = "";
      if (row.storage_path) {
        const { data: signedData, error: signedError } = await supa.storage
          .from("profile-image-library")
          .createSignedUrl(row.storage_path, 60 * 60);
        if (signedError) {
          console.warn("[profile/photos.get] signed url error:", signedError);
        } else {
          signedUrl = signedData?.signedUrl || "";
        }
      }
      photos.push({
        id: row.id,
        status: row.status,
        created_at: row.created_at,
        public_url: row.public_url,
        storage_path: row.storage_path,
        url: signedUrl || row.public_url || "",
      });
    }

    return { photos };
  } catch (err) {
    console.error("[profile/photos.get] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
