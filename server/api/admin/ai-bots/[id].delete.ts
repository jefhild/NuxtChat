import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const personaId = params.id;
    if (!personaId) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing persona id" };
    }

    const supabase = await getServiceRoleClient(event);

    const { data: persona, error: lookupError } = await supabase
      .from("ai_personas")
      .select("profile_user_id")
      .eq("id", personaId)
      .single();

    if (lookupError) throw lookupError;

    if (persona?.profile_user_id) {
      const { error: deleteUserError } = await supabase.auth.admin.deleteUser(
        persona.profile_user_id
      );
      if (deleteUserError) throw deleteUserError;
    } else {
      const { error: deletePersonaError } = await supabase
        .from("ai_personas")
        .delete()
        .eq("id", personaId);
      if (deletePersonaError) throw deletePersonaError;
    }

    return { success: true };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] delete error:", err);
    const message = err?.message || "Unable to delete AI bot";
    const status = /missing/i.test(message) ? 400 : 500;
    setResponseStatus(event, status);
    return {
      success: false,
      error: message,
    };
  }
});
