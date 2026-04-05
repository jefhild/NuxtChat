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
  const source = query.source as string | undefined;
  const from = query.from as string | undefined;
  const to = query.to as string | undefined;
  const page = query.page as string | undefined;

  let q = supabase
    .from("seo_snapshots")
    .select("*")
    .order("snapshot_date", { ascending: false })
    .limit(2000);

  if (source) q = q.eq("source", source);
  if (from) q = q.gte("snapshot_date", from);
  if (to) q = q.lte("snapshot_date", to);
  if (page) q = q.eq("page_url", page);

  const { data, error } = await q;

  if (error) {
    setResponseStatus(event, 500);
    return { error: error.message };
  }

  return { data };
});
