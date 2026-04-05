import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { diagnoseBingConnection } from "~/server/utils/bingWebmasterClient";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) { setResponseStatus(event, 401); return { error: "Unauthorized" }; }

  const supabase = await getServiceRoleClient(event);
  const { data: me } = await supabase.from("profiles").select("is_admin").eq("user_id", user.id).single();
  if (!me?.is_admin) { setResponseStatus(event, 403); return { error: "Forbidden" }; }

  const cfg = useRuntimeConfig(event) as Record<string, unknown>;
  const apiKey = cfg.BING_WEBMASTER_API_KEY as string;
  const siteUrl = cfg.BING_SITE_URL as string;

  if (!apiKey || !siteUrl) {
    return { configured: false, message: "BING_WEBMASTER_API_KEY or BING_SITE_URL not set" };
  }

  const result = await diagnoseBingConnection(apiKey, siteUrl);
  return { configured: true, siteUrl, ...result };
});
