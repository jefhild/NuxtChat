import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

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

  const query = getQuery(event);
  const limit = Math.min(parseInt((query.limit as string) || "30"), 90);

  const { data, error } = await supabase
    .from("seo_briefs")
    .select("*")
    .order("brief_date", { ascending: false })
    .limit(limit);

  if (error) {
    setResponseStatus(event, 500);
    return { error: error.message };
  }

  return { data };
});
