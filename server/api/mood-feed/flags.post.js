import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const body = (await readBody(event)) || {};
  const targetType = String(body.targetType || "").trim();
  const targetId = String(body.targetId || "").trim();
  const reason = body.reason ? String(body.reason).trim() : null;

  if (!["entry", "reply"].includes(targetType) || !targetId) {
    throw createError({
      statusCode: 400,
      statusMessage: "targetType and targetId required",
    });
  }

  const supabase = await getServiceRoleClient(event);
  const { error } = await supabase.from("mood_feed_flags").insert({
    target_type: targetType,
    target_id: targetId,
    user_id: user.id,
    reason,
  });
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  return { ok: true };
});
