import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const DECORATIONS_BUCKET = "avatar-decorations";
const DECORATIONS_FOLDER = "decorations";
const fallbackLabelFromFilename = (name) =>
  String(name || "")
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();

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
        "[admin/avatar-decorations.list] admin check error:",
        meErr
      );
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data, error } = await supa.storage
      .from(DECORATIONS_BUCKET)
      .list(DECORATIONS_FOLDER, {
        limit: 300,
        sortBy: { column: "name", order: "asc" },
      });

    if (error) {
      console.error(
        "[admin/avatar-decorations.list] storage list error:",
        error
      );
      setResponseStatus(event, 500);
      return { error: { stage: "storage_list", message: error.message } };
    }

    const files = (data || []).filter((file) => file?.name);
    const storageNames = files.map((file) => file.name);
    let labelByStorageName = {};

    if (storageNames.length) {
      const { data: metadataRows, error: metadataError } = await supa
        .from("avatar_decorations")
        .select("storage_name, display_name, is_active")
        .in("storage_name", storageNames);

      if (metadataError) {
        console.warn(
          "[admin/avatar-decorations.list] metadata lookup warning:",
          metadataError
        );
      } else {
        labelByStorageName = (metadataRows || [])
          .filter((row) => row?.storage_name && row?.is_active !== false)
          .reduce((acc, row) => {
            acc[row.storage_name] =
              String(row.display_name || "").trim() ||
              fallbackLabelFromFilename(row.storage_name);
            return acc;
          }, {});
      }
    }

    const items = files
      .map((file) => {
        const path = `${DECORATIONS_FOLDER}/${file.name}`;
        const { data: publicData } = supa.storage
          .from(DECORATIONS_BUCKET)
          .getPublicUrl(path);
        return {
          name: file.name,
          label:
            labelByStorageName[file.name] || fallbackLabelFromFilename(file.name),
          url: publicData?.publicUrl || "",
        };
      })
      .filter((item) => item.url);

    return { items };
  } catch (err) {
    console.error("[admin/avatar-decorations.list] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
