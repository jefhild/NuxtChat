import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const replyId = String(event.context?.params?.id || "").trim();
  if (!replyId) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  const supabase = await getServiceRoleClient(event);

  const { data: reply, error: replyErr } = await supabase
    .from("mood_feed_replies")
    .select("id, user_id")
    .eq("id", replyId)
    .maybeSingle();
  if (replyErr) {
    throw createError({ statusCode: 500, statusMessage: replyErr.message });
  }
  if (!reply) {
    throw createError({ statusCode: 404, statusMessage: "Reply not found" });
  }
  if (String(reply.user_id) !== String(user.id)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const { error: delErr } = await supabase
    .from("mood_feed_replies")
    .delete()
    .eq("id", replyId);
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: delErr.message });
  }

  return { ok: true, replyId };
});
