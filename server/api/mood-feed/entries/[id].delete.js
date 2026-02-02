import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const entryId = String(event.context?.params?.id || "").trim();
  if (!entryId) {
    throw createError({ statusCode: 400, statusMessage: "id required" });
  }

  const supabase = await getServiceRoleClient(event);

  const { data: entry, error: entryErr } = await supabase
    .from("mood_feed_entries")
    .select("id, user_id")
    .eq("id", entryId)
    .maybeSingle();
  if (entryErr) {
    throw createError({ statusCode: 500, statusMessage: entryErr.message });
  }
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: "Entry not found" });
  }
  if (String(entry.user_id) !== String(user.id)) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }

  const { error: delErr } = await supabase
    .from("mood_feed_entries")
    .delete()
    .eq("id", entryId);
  if (delErr) {
    throw createError({ statusCode: 500, statusMessage: delErr.message });
  }

  return { ok: true, entryId };
});
