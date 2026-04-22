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
    const body = (await readBody(event)) || {};
    const personaInput = body.persona || {};

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);
    const profileUserId = String(personaInput.profile_user_id || "").trim();
    if (!profileUserId) {
      throw new Error("profile_user_id is required.");
    }

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", profileUserId)
      .maybeSingle();

    if (profileLookupError) throw profileLookupError;
    if (!existingProfile?.user_id) {
      throw new Error("Selected profile was not found.");
    }

    const { data: existingPersona, error: existingPersonaErr } = await supabase
      .from("ai_personas")
      .select("id, persona_key, is_active, list_publicly")
      .eq("profile_user_id", profileUserId)
      .limit(1)
      .maybeSingle();
    if (existingPersonaErr) throw existingPersonaErr;
    if (existingPersona?.id) {
      throw createError({
        statusCode: 409,
        statusMessage: `This profile is already linked to AI persona "${existingPersona.persona_key || existingPersona.id}". Clear filters/search or edit that existing bot instead.`,
      });
    }

    const personaPayload = buildPersonaPayload(personaInput, profileUserId);
    personaPayload.metadata = mergeMoltbookPersonaConfig({
      metadata: personaPayload.metadata,
      personaKey: personaPayload.persona_key,
      moltbookInput: personaInput?.moltbook_config,
      config: useRuntimeConfig(event),
    });

    const profilePatch: Record<string, unknown> = { is_ai: true };
    if (personaPayload.is_active === false) profilePatch.is_private = true;
    if (personaPayload.is_active === true) profilePatch.is_private = false;
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update(profilePatch)
      .eq("user_id", profileUserId);
    if (profileUpdateError) throw profileUpdateError;

    const { data: personaRow, error: personaError } = await supabase
      .from("ai_personas")
      .insert(personaPayload)
      .select("id")
      .single();
    if (personaError) throw personaError;

    const { data: persona, error: fetchError } = await fetchPersonaById(
      supabase,
      personaRow.id
    );

    if (fetchError) throw fetchError;

    return {
      success: true,
      data: decoratePersonaWithMoltbook({ persona, event }),
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] create error:", err);
    const message =
      err?.statusMessage || err?.message || "Unable to create AI bot";
    const status = err?.statusCode
      ? err.statusCode
      : /required/i.test(message)
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
