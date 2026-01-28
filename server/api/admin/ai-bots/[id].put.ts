import {
  buildPersonaPayload,
  buildProfilePayload,
  fetchPersonaById,
  getServiceRoleClient,
} from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const personaId = params.id;
    if (!personaId) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing persona id" };
    }

    const body = (await readBody(event)) || {};
    const profileInput = body.profile || {};
    const personaInput = body.persona || {};

    const supabase = await getServiceRoleClient(event);
    const { data: persona, error: personaLookupError } = await supabase
      .from("ai_personas")
      .select("profile_user_id")
      .eq("id", personaId)
      .single();

    if (personaLookupError) throw personaLookupError;
    if (!persona?.profile_user_id) {
      throw new Error("Persona is missing a linked profile.");
    }

    const profilePayload = buildProfilePayload({
      ...profileInput,
      user_id: persona.profile_user_id,
    });

    const personaPayload = buildPersonaPayload(
      personaInput,
      persona.profile_user_id
    );
    if (personaPayload.is_active === false) {
      profilePayload.is_private = true;
    } else if (personaPayload.is_active === true) {
      profilePayload.is_private = false;
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update(profilePayload)
      .eq("user_id", persona.profile_user_id);
    if (profileUpdateError) throw profileUpdateError;

    const { error: personaUpdateError } = await supabase
      .from("ai_personas")
      .update(personaPayload)
      .eq("id", personaId);
    if (personaUpdateError) throw personaUpdateError;

    const { data: updatedPersona, error: fetchError } = await fetchPersonaById(
      supabase,
      personaId
    );
    if (fetchError) throw fetchError;

    return { success: true, data: updatedPersona };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] update error:", err);
    const message = err?.message || "Unable to update AI bot";
    const status = /missing/i.test(message)
      ? 400
      : err?.code === "23505"
      ? 409
      : 500;
    setResponseStatus(event, status);
    return {
      success: false,
      error: message,
    };
  }
});
