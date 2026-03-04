import { readBody } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const DECORATIONS_BUCKET = "avatar-decorations";
const DECORATIONS_FOLDER = "decorations";

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
      console.error(
        "[admin/avatar-decorations.delete] admin check error:",
        meErr
      );
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const body = (await readBody(event)) || {};
    const name = String(body.name || "").trim();

    if (!name || name.includes("/")) {
      setResponseStatus(event, 400);
      return { error: { stage: "body", message: "name required" } };
    }

    const filePath = `${DECORATIONS_FOLDER}/${name}`;
    const { error } = await supa.storage
      .from(DECORATIONS_BUCKET)
      .remove([filePath]);

    if (error) {
      console.error("[admin/avatar-decorations.delete] delete error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "delete", message: error.message } };
    }

    const { error: metadataDeleteError } = await supa
      .from("avatar_decorations")
      .delete()
      .eq("storage_name", name);
    if (metadataDeleteError) {
      console.warn(
        "[admin/avatar-decorations.delete] metadata delete warning:",
        metadataDeleteError
      );
    }

    return { success: true };
  } catch (err) {
    console.error("[admin/avatar-decorations.delete] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
