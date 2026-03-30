import { getServiceRoleClient } from "~/server/utils/aiBots";

// Topic hint inference shared by SET_LIVE_MOOD_STATE and the snapshot endpoint
const INTAKE_TOPIC_KEYWORDS: Record<string, string[]> = {
  family:        ["parent", "mom", "dad", "mother", "father", "brother", "sister", "family", "sibling", "son", "daughter", "kid", "child"],
  work:          ["work", "job", "boss", "colleague", "office", "coworker", "career", "manager", "client", "meeting"],
  relationships: ["girlfriend", "boyfriend", "partner", "ex", "date", "dating", "relationship", "husband", "wife", "crush", "love"],
  health:        ["health", "sick", "pain", "doctor", "anxiety", "tired", "exhausted", "stress", "mental", "depressed", "ill"],
};

export function inferTopicHint(text: string | null | undefined): string {
  if (!text) return "general";
  const lower = text.toLowerCase();
  for (const [topic, keywords] of Object.entries(INTAKE_TOPIC_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return topic;
  }
  return "general";
}

export const BOT_CAPABILITIES = {
  HANDOFF_TO_PERSONA: "handoff_to_persona",
  SET_LIVE_MOOD_STATE: "set_live_mood_state",
  SET_MOOD_PREFERENCES: "set_mood_preferences",
} as const;

const PERSONA_POLICIES: Record<string, string[]> = {
  imchatty: [BOT_CAPABILITIES.HANDOFF_TO_PERSONA],
};

const normalizePersonaKey = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

const normalizeChoice = (value: unknown, allowed: string[], fallback: string) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return allowed.includes(normalized) ? normalized : fallback;
};

export const LIVE_MOOD_TAXONOMY = {
  emotions: [
    "lonely",
    "calm",
    "annoyed",
    "overwhelmed",
    "playful",
    "curious",
    "hopeful",
    "sad",
  ],
  intents: [
    "be_heard",
    "listen",
    "distract_me",
    "deep_talk",
    "casual_chat",
    "meet_someone_similar",
  ],
  energy: ["drained", "normal", "wired"],
  privacy: ["public_mood_post", "private_matching_only"],
  timeHorizon: ["right_now", "today", "generally_lately"],
} as const;

const DEFAULT_STARTER_PERSONA_KEYS = {
  feminine: "starter-feminine",
  masculine: "starter-masculine",
  neutral: "starter-neutral",
} as const;

function ensureCapabilityAllowed(personaKey: string, capability: string) {
  const normalizedPersona = normalizePersonaKey(personaKey);
  const allowed = PERSONA_POLICIES[normalizedPersona] || [];
  if (allowed.includes(capability)) return true;
  if (
    capability === BOT_CAPABILITIES.SET_LIVE_MOOD_STATE ||
    capability === BOT_CAPABILITIES.SET_MOOD_PREFERENCES
  ) {
    return normalizedPersona && normalizedPersona !== "imchatty";
  }
  return false;
}

async function logBotAction({
  event,
  actorPersona,
  capability,
  actorUserId = null,
  targetUserId = null,
  requestSummary = {},
  resultSummary = {},
  status = "ok",
}: {
  event: any;
  actorPersona: string;
  capability: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  requestSummary?: Record<string, any>;
  resultSummary?: Record<string, any>;
  status?: "ok" | "denied" | "error";
}) {
  try {
    const supabase = await getServiceRoleClient(event);
    await supabase.from("bot_action_logs").insert({
      actor_persona: actorPersona,
      capability,
      actor_user_id: actorUserId,
      target_user_id: targetUserId,
      request_summary: requestSummary,
      result_summary: resultSummary,
      status,
    });
  } catch (err) {
    console.warn("[bot-platform] log failed:", err);
  }
}

async function fetchUserGenderId(event: any, userId: string | null = null) {
  if (!userId) return null;
  const supabase = await getServiceRoleClient(event);
  const { data } = await supabase
    .from("profiles")
    .select("gender_id")
    .eq("user_id", userId)
    .maybeSingle();
  const genderId = Number(data?.gender_id);
  return Number.isFinite(genderId) ? genderId : null;
}

async function findPersonaByKey(event: any, personaKey: string) {
  const supabase = await getServiceRoleClient(event);
  const select = `
    persona_key,
    list_publicly,
    is_active,
    honey_enabled,
    profile:profiles!ai_personas_profile_user_id_fkey (
      user_id,
      displayname,
      avatar_url,
      tagline,
      bio,
      is_ai,
      gender_id
    )
  `;

  const { data } = await supabase
    .from("ai_personas")
    .select(select)
    .eq("persona_key", normalizePersonaKey(personaKey))
    .eq("is_active", true)
    .eq("honey_enabled", false)
    .maybeSingle();

  return data?.profile?.user_id ? data : null;
}

export async function choosePostOnboardingPersona(
  event: any,
  { targetUserId = null }: { targetUserId?: string | null } = {}
) {
  const config = useRuntimeConfig(event);
  const preferredKey = normalizePersonaKey(
    config.POST_ONBOARDING_HANDOFF_PERSONA_KEY ||
      config.public?.POST_ONBOARDING_HANDOFF_PERSONA_KEY ||
      ""
  );
  const starterFeminineKey = normalizePersonaKey(
    config.POST_ONBOARDING_STARTER_FEMININE_KEY ||
      config.public?.POST_ONBOARDING_STARTER_FEMININE_KEY ||
      DEFAULT_STARTER_PERSONA_KEYS.feminine
  );
  const starterMasculineKey = normalizePersonaKey(
    config.POST_ONBOARDING_STARTER_MASCULINE_KEY ||
      config.public?.POST_ONBOARDING_STARTER_MASCULINE_KEY ||
      DEFAULT_STARTER_PERSONA_KEYS.masculine
  );
  const starterNeutralKey = normalizePersonaKey(
    config.POST_ONBOARDING_STARTER_NEUTRAL_KEY ||
      config.public?.POST_ONBOARDING_STARTER_NEUTRAL_KEY ||
      DEFAULT_STARTER_PERSONA_KEYS.neutral
  );
  const supabase = await getServiceRoleClient(event);

  const select = `
    persona_key,
    list_publicly,
    is_active,
    honey_enabled,
    profile:profiles!ai_personas_profile_user_id_fkey (
      user_id,
      displayname,
      avatar_url,
      tagline,
      bio,
      is_ai,
      gender_id
    )
  `;

  if (preferredKey) {
    const preferred = await supabase
      .from("ai_personas")
      .select(select)
      .eq("persona_key", preferredKey)
      .eq("is_active", true)
      .eq("honey_enabled", false)
      .maybeSingle();
    if (preferred?.data?.profile?.user_id) return preferred.data;
  }

  const userGenderId = await fetchUserGenderId(event, targetUserId);
  const starterCandidates =
    userGenderId === 1
      ? [starterFeminineKey, starterNeutralKey, starterMasculineKey]
      : userGenderId === 2
      ? [starterMasculineKey, starterNeutralKey, starterFeminineKey]
      : [starterNeutralKey, starterFeminineKey, starterMasculineKey];

  for (const personaKey of starterCandidates.filter(Boolean)) {
    const starter = await findPersonaByKey(event, personaKey);
    if (starter) return starter;
  }

  const { data } = await supabase
    .from("ai_personas")
    .select(select)
    .eq("is_active", true)
    .eq("list_publicly", true)
    .eq("honey_enabled", false)
    .neq("persona_key", "imchatty")
    .order("updated_at", { ascending: false })
    .limit(20);

  return (data || []).find((row: any) => row?.profile?.user_id) || null;
}

export async function executeBotCapability({
  event,
  actorPersona,
  capability,
  actorUserId = null,
  targetUserId = null,
  payload = {},
}: {
  event: any;
  actorPersona: string;
  capability: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  payload?: Record<string, any>;
}) {
  const normalizedPersona = normalizePersonaKey(actorPersona);
  if (!ensureCapabilityAllowed(normalizedPersona, capability)) {
    await logBotAction({
      event,
      actorPersona: normalizedPersona || "unknown",
      capability,
      actorUserId,
      targetUserId,
      requestSummary: payload,
      resultSummary: { error: "capability_denied" },
      status: "denied",
    });
    throw createError({
      statusCode: 403,
      statusMessage: "Capability denied",
    });
  }

  const supabase = await getServiceRoleClient(event);

  if (capability === BOT_CAPABILITIES.HANDOFF_TO_PERSONA) {
    const toPersona = normalizePersonaKey(payload.toPersona);
    const reason = String(payload.reason || "handoff").trim() || "handoff";
    if (!targetUserId || !toPersona) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing handoff target",
      });
    }
    const { data: persona, error: personaError } = await supabase
      .from("ai_personas")
      .select(
        `
          persona_key,
          profile:profiles!ai_personas_profile_user_id_fkey (
            user_id,
            displayname,
            avatar_url,
            tagline,
            bio
          )
        `
      )
      .eq("persona_key", toPersona)
      .eq("is_active", true)
      .maybeSingle();
    if (personaError || !persona?.profile?.user_id) {
      throw createError({
        statusCode: 404,
        statusMessage: "Handoff persona not found",
      });
    }

    const contextSummary = {
      onboarding_just_completed: !!payload.onboardingJustCompleted,
      displayname: payload.displayname || null,
      bio: payload.bio || null,
      locale: payload.locale || null,
      nudges: payload.nudges || {},
    };

    const { error } = await supabase.from("bot_handoffs").insert({
      user_id: targetUserId,
      from_persona: normalizedPersona,
      to_persona: toPersona,
      reason,
      context_summary: contextSummary,
    });
    if (error) throw error;

    await logBotAction({
      event,
      actorPersona: normalizedPersona,
      capability,
      actorUserId,
      targetUserId,
      requestSummary: payload,
      resultSummary: {
        toPersona,
        personaUserId: persona.profile.user_id,
      },
    });

    return {
      personaKey: toPersona,
      profile: persona.profile,
    };
  }

  if (capability === BOT_CAPABILITIES.SET_LIVE_MOOD_STATE) {
    if (!targetUserId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing target user",
      });
    }

    const emotion = normalizeChoice(
      payload.emotion,
      [...LIVE_MOOD_TAXONOMY.emotions],
      "calm"
    );
    const intent = normalizeChoice(
      payload.intent,
      [...LIVE_MOOD_TAXONOMY.intents],
      "casual_chat"
    );
    const energy = normalizeChoice(
      payload.energy,
      [...LIVE_MOOD_TAXONOMY.energy],
      "normal"
    );
    const privacy = normalizeChoice(
      payload.privacy,
      [...LIVE_MOOD_TAXONOMY.privacy],
      "private_matching_only"
    );
    const timeHorizon = normalizeChoice(
      payload.timeHorizon || payload.time_horizon,
      [...LIVE_MOOD_TAXONOMY.timeHorizon],
      "right_now"
    );
    const confidenceNum = Number(payload.confidence);
    const expiresAt = payload.expiresAt || payload.expires_at || null;

    const upsertPayload = {
      user_id: targetUserId,
      emotion,
      intent,
      energy,
      privacy,
      time_horizon: timeHorizon,
      free_text_raw: payload.freeTextRaw || payload.free_text_raw || null,
      free_text_refined:
        payload.freeTextRefined || payload.free_text_refined || null,
      source_persona: normalizedPersona,
      source_type: normalizeChoice(
        payload.sourceType || payload.source_type,
        ["self_selected", "bot_inferred", "mixed"],
        "mixed"
      ),
      confidence:
        Number.isFinite(confidenceNum) && confidenceNum >= 0 && confidenceNum <= 1
          ? confidenceNum
          : null,
      captured_at: new Date().toISOString(),
      expires_at: expiresAt || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("live_mood_states")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
    if (error) throw error;

    await logBotAction({
      event,
      actorPersona: normalizedPersona,
      capability,
      actorUserId,
      targetUserId,
      requestSummary: payload,
      resultSummary: {
        emotion,
        intent,
        energy,
        privacy,
        timeHorizon,
      },
    });

    // Snapshot live mood into match_intakes so the matching pool is up-to-date.
    // Non-fatal — if the table doesn't exist yet this is silently skipped.
    if (data && targetUserId) {
      try {
        const topicHint = inferTopicHint(data.free_text_raw);
        const { error: intakeErr } = await supabase
          .from("match_intakes")
          .insert({
            user_id:           targetUserId,
            emotion:           data.emotion,
            intent:            data.intent,
            energy:            data.energy,
            privacy:           data.privacy,
            time_horizon:      data.time_horizon,
            free_text_raw:     data.free_text_raw,
            free_text_refined: data.free_text_refined,
            confidence:        data.confidence,
            topic_hint:        topicHint,
            source_persona:    data.source_persona,
          });
        if (intakeErr) {
          console.warn("[SET_LIVE_MOOD_STATE] match_intake insert skipped:", intakeErr.message);
        }
      } catch (e: any) {
        console.warn("[SET_LIVE_MOOD_STATE] match_intake error:", e?.message || e);
      }
    }

    return data;
  }

  if (capability === BOT_CAPABILITIES.SET_MOOD_PREFERENCES) {
    if (!targetUserId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Missing target user",
      });
    }

    const upsertPayload = {
      user_id: targetUserId,
      allow_mood_matching:
        typeof payload.allowMoodMatching === "boolean"
          ? payload.allowMoodMatching
          : true,
      allow_bot_intro:
        typeof payload.allowBotIntro === "boolean" ? payload.allowBotIntro : true,
      default_mood_privacy: normalizeChoice(
        payload.defaultMoodPrivacy,
        [...LIVE_MOOD_TAXONOMY.privacy],
        "private_matching_only"
      ),
      show_profile_aura:
        typeof payload.showProfileAura === "boolean"
          ? payload.showProfileAura
          : false,
      preferred_intents: Array.isArray(payload.preferredIntents)
        ? payload.preferredIntents
            .map((value: unknown) =>
              normalizeChoice(value, [...LIVE_MOOD_TAXONOMY.intents], "")
            )
            .filter(Boolean)
        : [],
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("mood_preferences")
      .upsert(upsertPayload, { onConflict: "user_id" })
      .select("*")
      .maybeSingle();
    if (error) throw error;

    await logBotAction({
      event,
      actorPersona: normalizedPersona,
      capability,
      actorUserId,
      targetUserId,
      requestSummary: payload,
      resultSummary: {
        defaultMoodPrivacy: upsertPayload.default_mood_privacy,
      },
    });

    return data;
  }

  throw createError({
    statusCode: 400,
    statusMessage: "Unknown capability",
  });
}
