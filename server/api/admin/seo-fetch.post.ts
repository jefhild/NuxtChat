import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { runSeoSnapshot } from "~/server/tasks/seo/daily-snapshot";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const supabase = await getServiceRoleClient(event);

  const { data: me, error: meErr } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("user_id", user.id)
    .single();

  if (meErr || !me?.is_admin) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  try {
    const result = await runSeoSnapshot(event);
    return { success: true, result };
  } catch (err) {
    setResponseStatus(event, 500);
    return { error: (err as Error).message };
  }
});
