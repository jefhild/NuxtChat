import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const AVATAR_BUCKET = "profile-avatars";
const FOLDERS = ["male", "female", "other"];

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
      console.error("[admin/profile-avatars.list] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const items = {};

    for (const folder of FOLDERS) {
      const { data, error } = await supa.storage
        .from(AVATAR_BUCKET)
        .list(folder, {
          limit: 200,
          sortBy: { column: "name", order: "asc" },
        });

      if (error) {
        console.error(
          "[admin/profile-avatars.list] storage list error:",
          error
        );
        setResponseStatus(event, 500);
        return { error: { stage: "storage_list", message: error.message } };
      }

      items[folder] = (data || [])
        .filter((file) => file?.name)
        .map((file) => {
          const path = `${folder}/${file.name}`;
          const { data: publicData } = supa.storage
            .from(AVATAR_BUCKET)
            .getPublicUrl(path);
          return { name: file.name, url: publicData?.publicUrl || "" };
        })
        .filter((item) => item.url);
    }

    return { items };
  } catch (err) {
    console.error("[admin/profile-avatars.list] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
