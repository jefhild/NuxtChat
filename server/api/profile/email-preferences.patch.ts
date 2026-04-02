import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user?.id) {
    setResponseStatus(event, 401);
    return { error: "Unauthorized" };
  }

  const body = await readBody(event);
  if (typeof body?.email_digest_enabled !== "boolean") {
    setResponseStatus(event, 400);
    return { error: "email_digest_enabled (boolean) is required" };
  }

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error } = await supa
    .from("profiles")
    .update({ email_digest_enabled: body.email_digest_enabled })
    .eq("user_id", user.id);

  if (error) {
    console.error("[email-preferences] update error:", error);
    setResponseStatus(event, 500);
    return { error: error.message };
  }

  return { success: true, email_digest_enabled: body.email_digest_enabled };
});
