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
      console.error("[admin/profile-photos.list] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const query = getQuery(event) || {};
    const status = String(query.status || "").trim();
    const limit = Math.min(Number(query.limit || 200), 500);

    let builder = supa
      .from("profile_photos")
      .select("id, user_id, storage_path, public_url, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      builder = builder.eq("status", status);
    }

    const { data, error } = await builder;

    if (error) {
      console.error("[admin/profile-photos.list] list error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "list", message: error.message } };
    }

    const userIds = Array.from(
      new Set((data || []).map((row) => row.user_id).filter(Boolean))
    );
    let displaynameByUserId = {};

    if (userIds.length) {
      const { data: profileRows, error: profileError } = await supa
        .from("profiles")
        .select("user_id, displayname")
        .in("user_id", userIds);

      if (profileError) {
        console.error("[admin/profile-photos.list] profiles error:", profileError);
        setResponseStatus(event, 500);
        return { error: { stage: "profiles", message: profileError.message } };
      }

      displaynameByUserId = (profileRows || []).reduce((acc, row) => {
        if (row?.user_id) acc[row.user_id] = row.displayname || "";
        return acc;
      }, {});
    }

    const photos = [];

    for (const row of data || []) {
      let signedUrl = "";
      if (row.storage_path) {
        const { data: signedData, error: signedError } = await supa.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(row.storage_path, 60 * 60);
        if (signedError) {
          console.warn("[admin/profile-photos.list] signed url error:", signedError);
        } else {
          signedUrl = signedData?.signedUrl || "";
        }
      }
      photos.push({
        id: row.id,
        user_id: row.user_id,
        displayname: displaynameByUserId[row.user_id] || "",
        status: row.status,
        created_at: row.created_at,
        public_url: row.public_url,
        storage_path: row.storage_path,
        url: signedUrl || row.public_url || "",
      });
    }

    return { photos };
  } catch (err) {
    console.error("[admin/profile-photos.list] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
