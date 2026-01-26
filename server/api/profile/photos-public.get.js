import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const PHOTO_BUCKET = "profile-image-library";

export default defineEventHandler(async (event) => {
  try {
    let user = null;
    try {
      user = await serverSupabaseUser(event);
    } catch (err) {
      const message = err?.cause?.statusMessage || err?.message || "";
      if (!message.includes("Auth session missing")) {
        throw err;
      }
    }
    const canViewPhotos = Boolean(user?.id && !user.is_anonymous);

    const query = getQuery(event) || {};
    const userId = String(query.userId || query.user_id || "").trim();
    const limit = Math.min(Number(query.limit || 24), 50);
    if (!userId) {
      setResponseStatus(event, 400);
      return { error: "Missing userId" };
    }

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { count, error: countError } = await supa
      .from("profile_photos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "approved");

    if (countError) {
      console.error("[profile/photos-public] count error:", countError);
      setResponseStatus(event, 500);
      return { error: { stage: "count", message: countError.message } };
    }

    const total = Number(count || 0);
    if (!canViewPhotos) {
      return { count: total, photos: [] };
    }

    const { data, error } = await supa
      .from("profile_photos")
      .select("id, storage_path, public_url, status, created_at")
      .eq("user_id", userId)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("[profile/photos-public] list error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "list", message: error.message } };
    }

    const photoIds = (data || []).map((row) => row.id).filter(Boolean);
    const voteByPhotoId = {};
    const myVoteByPhotoId = {};

    if (photoIds.length) {
      const { data: voteRows, error: voteError } = await supa
        .from("votes_unified")
        .select("target_id, value, user_id")
        .eq("target_type", "profile_photo")
        .in("target_id", photoIds);

      if (voteError) {
        console.error("[profile/photos-public] vote error:", voteError);
      } else {
        for (const row of voteRows || []) {
          const targetId = row.target_id;
          if (row.value === 1) {
            voteByPhotoId[targetId] = (voteByPhotoId[targetId] || 0) + 1;
          }
          if (row.user_id === user.id) {
            myVoteByPhotoId[targetId] = row.value || 0;
          }
        }
      }
    }

    const photos = [];
    for (const row of data || []) {
      let signedUrl = "";
      if (row.storage_path) {
        const { data: signedData, error: signedError } = await supa.storage
          .from(PHOTO_BUCKET)
          .createSignedUrl(row.storage_path, 60 * 60);
        if (signedError) {
          console.warn("[profile/photos-public] signed url error:", signedError);
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
        upvotes: Number(voteByPhotoId[row.id] || 0),
        myVote: Number(myVoteByPhotoId[row.id] || 0),
      });
    }

    return { count: total, photos };
  } catch (err) {
    console.error("[profile/photos-public] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
