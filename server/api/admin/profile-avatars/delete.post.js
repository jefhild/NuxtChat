import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const AVATAR_BUCKET = "profile-avatars";
const ALLOWED_FOLDERS = new Set(["male", "female", "other"]);

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
      console.error("[admin/profile-avatars.delete] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const body = (await readBody(event)) || {};
    const folder = String(body.folder || "").trim();
    const name = String(body.name || "").trim();

    if (!ALLOWED_FOLDERS.has(folder) || !name) {
      setResponseStatus(event, 400);
      return {
        error: { stage: "body", message: "folder and name required" },
      };
    }

    const filePath = `${folder}/${name}`;
    const { error } = await supa.storage.from(AVATAR_BUCKET).remove([filePath]);

    if (error) {
      console.error("[admin/profile-avatars.delete] delete error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: error.message } };
    }

    return { success: true };
  } catch (err) {
    console.error("[admin/profile-avatars.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
