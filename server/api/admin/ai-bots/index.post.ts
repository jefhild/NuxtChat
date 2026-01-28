import {
  buildPersonaPayload,
  buildProfilePayload,
  fetchPersonaById,
  generateBotEmail,
  generateBotPassword,
  getServiceRoleClient,
  slugify,
} from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const profileInput = body.profile || {};
    const personaInput = body.persona || {};
    const authInput = body.auth || {};

    const supabase = await getServiceRoleClient(event);
    const profilePayload = buildProfilePayload(profileInput);

    const personaKeySeed =
      personaInput.persona_key ||
      profilePayload.slug ||
      profilePayload.displayname;

    let userId = authInput.user_id || profileInput.user_id || null;
    let credentials: { email: string; password: string } | null = null;

    if (!userId) {
      const email =
        authInput.email ||
        profileInput.email ||
        generateBotEmail(personaKeySeed);
      const password = authInput.password || generateBotPassword();

      const { data: userData, error: userErr } =
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            is_ai: true,
            persona_key: slugify(personaKeySeed),
          },
        });

      if (userErr) throw userErr;
      if (!userData?.user?.id) throw new Error("Failed to create auth user.");

      userId = userData.user.id;
      credentials = { email, password };
    }

    profilePayload.user_id = userId;

    const personaPayload = buildPersonaPayload(personaInput, userId);
    if (personaPayload.is_active === false) {
      profilePayload.is_private = true;
    } else if (personaPayload.is_active === true) {
      profilePayload.is_private = false;
    }

    const { data: existingProfile, error: profileLookupError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileLookupError) throw profileLookupError;

    if (existingProfile) {
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update(profilePayload)
        .eq("user_id", userId);
      if (profileUpdateError) throw profileUpdateError;
    } else {
      const { error: profileInsertError } = await supabase
        .from("profiles")
        .insert(profilePayload);
      if (profileInsertError) throw profileInsertError;
    }

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
      data: persona,
      credentials,
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/ai-bots] create error:", err);
    const message = err?.message || "Unable to create AI bot";
    const status = /required/i.test(message)
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
