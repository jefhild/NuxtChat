import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAdmin } from "~/server/utils/adminAuth";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const personaId = params.id;
    if (!personaId) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing persona id" };
    }

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const { error: deletePersonaError } = await supabase
      .from("ai_personas")
      .delete()
      .eq("id", personaId);
    if (deletePersonaError) throw deletePersonaError;

    return { success: true };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] delete error:", err);
    const message =
      err?.statusMessage || err?.message || "Unable to delete AI bot";
    const status = err?.statusCode
      ? err.statusCode
      : /missing/i.test(message)
      ? 400
      : 500;
    setResponseStatus(event, status);
    return {
      success: false,
      error: message,
    };
  }
});
