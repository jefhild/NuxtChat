import {
  buildPersonaPayload,
  fetchPersonaById,
  getServiceRoleClient,
} from "~/server/utils/aiBots";
import { ensureAdmin } from "~/server/utils/adminAuth";
import {
  decoratePersonaWithMoltbook,
  mergeMoltbookPersonaConfig,
} from "~/server/utils/moltbook";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const personaId = params.id;
    if (!personaId) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing persona id" };
    }

    const body = (await readBody(event)) || {};
    const personaInput = body.persona || {};

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);
    const { data: persona, error: personaLookupError } = await supabase
      .from("ai_personas")
      .select("profile_user_id, persona_key, metadata")
      .eq("id", personaId)
      .single();

    if (personaLookupError) throw personaLookupError;
    if (!persona?.profile_user_id) {
      throw new Error("Persona is missing a linked profile.");
    }

    const requestedProfileUserId = String(
      personaInput?.profile_user_id || persona.profile_user_id
    ).trim();
    if (!requestedProfileUserId) {
      throw new Error("profile_user_id is required.");
    }

    const switchingProfile = requestedProfileUserId !== persona.profile_user_id;
    if (switchingProfile) {
      const { data: profileRow, error: profileLookupError } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("user_id", requestedProfileUserId)
        .maybeSingle();
      if (profileLookupError) throw profileLookupError;
      if (!profileRow?.user_id) throw new Error("Selected profile was not found.");

      const { data: personaOnProfile, error: personaOnProfileErr } = await supabase
        .from("ai_personas")
        .select("id")
        .eq("profile_user_id", requestedProfileUserId)
        .neq("id", personaId)
        .limit(1)
        .maybeSingle();
      if (personaOnProfileErr) throw personaOnProfileErr;
      if (personaOnProfile?.id) {
        throw createError({
          statusCode: 409,
          statusMessage: "Selected profile is already linked to another AI persona.",
        });
      }
    }

    const personaPayload = buildPersonaPayload(
      personaInput,
      requestedProfileUserId
    );
    personaPayload.metadata = mergeMoltbookPersonaConfig({
      metadata:
        personaInput?.metadata !== undefined ? personaInput.metadata : persona.metadata,
      personaKey: personaPayload.persona_key || persona.persona_key,
      moltbookInput: personaInput?.moltbook_config,
      config: useRuntimeConfig(event),
    });
    const profilePatch: Record<string, unknown> = { is_ai: true };
    if (personaPayload.is_active === false) profilePatch.is_private = true;
    if (personaPayload.is_active === true) profilePatch.is_private = false;
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("user_id", requestedProfileUserId);
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

    return {
      success: true,
      data: decoratePersonaWithMoltbook({ persona: updatedPersona, event }),
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] update error:", err);
    const message =
      err?.statusMessage || err?.message || "Unable to update AI bot";
    const status = err?.statusCode
      ? err.statusCode
      : /missing/i.test(message)
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
