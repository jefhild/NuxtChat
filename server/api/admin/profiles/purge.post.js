import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const PROFILE_IMAGES_BUCKET = "profile-images";
const PROFILE_LIBRARY_BUCKET = "profile-image-library";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const body = (await readBody(event)) || {};
    const limit = Math.min(Number(body.limit || 200), 500);

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
      console.error("[admin/profiles/purge] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data: rows, error: fetchError } = await supa
      .from("profiles")
      .select("user_id")
      .not("marked_for_deletion_at", "is", null)
      .limit(limit);

    if (fetchError) {
      console.error("[admin/profiles/purge] fetch error:", fetchError);
      setResponseStatus(event, 500);
      return { error: { stage: "fetch", message: fetchError.message } };
    }

    const userIds = (rows || []).map((row) => row.user_id).filter(Boolean);
    if (!userIds.length) {
      return { deletedUserIds: [], failed: [] };
    }

    const deletedUserIds = [];
    const failed = [];

    const deleteProfileImagesForUser = async (userId) => {
      const { data: photoRows, error: fetchError } = await supa
        .from("profile_photos")
        .select("storage_path")
        .eq("user_id", userId);

      if (fetchError) {
        return { error: { stage: "fetch_profile_photos", message: fetchError.message } };
      }

      const paths = (photoRows || [])
        .map((row) => row.storage_path)
        .filter(Boolean);

      if (paths.length) {
        const { error: removeError } = await supa.storage
          .from(PROFILE_LIBRARY_BUCKET)
          .remove(paths);

        if (removeError) {
          return { error: { stage: "delete_profile_images", message: removeError.message } };
        }
      }

      const { error: deleteError } = await supa
        .from("profile_photos")
        .delete()
        .eq("user_id", userId);

      if (deleteError) {
        return { error: { stage: "delete_profile_photos", message: deleteError.message } };
      }

      const avatarPath = `${userId}/avatar.webp`;
      const { error: avatarRemoveError } = await supa.storage
        .from(PROFILE_IMAGES_BUCKET)
        .remove([avatarPath]);

      if (avatarRemoveError) {
        return {
          error: {
            stage: "delete_profile_avatar",
            message: avatarRemoveError.message,
          },
        };
      }

      return { success: true };
    };

    const deleteDiscussionMessagesForUser = async (userId) => {
      const { data: messages, error: messagesError } = await supa
        .from("messages_v2")
        .select("id")
        .eq("sender_user_id", userId);
      if (messagesError) {
        return { error: { stage: "fetch_messages_v2", message: messagesError.message } };
      }

        const messageIds = (messages || []).map((row) => row.id).filter(Boolean);
        if (messageIds.length) {
          const { error: scoreError } = await supa
          .from("votes_unified")
          .delete()
          .eq("target_type", "message")
          .in("target_id", messageIds);
        if (scoreError) {
          return {
            error: { stage: "delete_message_scores", message: scoreError.message },
          };
        }
      }

      const { error: deleteError } = await supa
        .from("messages_v2")
        .delete()
        .eq("sender_user_id", userId);
      if (deleteError) {
        return { error: { stage: "delete_messages_v2", message: deleteError.message } };
      }

      return { deletedCount: messageIds.length };
    };

    for (const userId of userIds) {
      try {
        const profileImageCleanup = await deleteProfileImagesForUser(userId);
        if (profileImageCleanup?.error) {
          failed.push({
            userId,
            stage: profileImageCleanup.error.stage,
            message: profileImageCleanup.error.message,
          });
          continue;
        }

        const discussionCleanup = await deleteDiscussionMessagesForUser(userId);
        if (discussionCleanup?.error) {
          failed.push({
            userId,
            stage: discussionCleanup.error.stage,
            message: discussionCleanup.error.message,
          });
          continue;
        }

        const { error: authError } = await supa.auth.admin.deleteUser(userId);
        if (authError) {
          failed.push({ userId, stage: "auth_delete", message: authError.message });
          continue;
        }

        const { error: profileError } = await supa
          .from("profiles")
          .delete()
          .eq("user_id", userId);
        if (profileError) {
          failed.push({
            userId,
            stage: "profile_delete",
            message: profileError.message,
          });
          continue;
        }

        deletedUserIds.push(userId);
      } catch (error) {
        failed.push({
          userId,
          stage: "unhandled",
          message: error?.message || String(error),
        });
      }
    }

    return { deletedUserIds, failed };
  } catch (err) {
    console.error("[admin/profiles/purge] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
