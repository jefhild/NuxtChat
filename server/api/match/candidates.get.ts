import { defineEventHandler, createError, getQuery } from "h3";
import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { normalizeLearningLanguageCode } from "~/server/utils/languageLearning";
import {
  fetchProfileLanguagePreferenceMap,
  withLanguagePreferenceFallback,
} from "~/server/utils/profileLanguagePreferences";

// How long ago a user must have been active to be considered "online" (ms)
const ONLINE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// Scoring weights — must sum to 1.0
const W = {
  intent:  0.40,
  emotion: 0.25,
  energy:  0.20,
  topic:   0.10,
  locale:  0.05,
} as const;

const LANGUAGE_MATCH_BONUS = 0.12;

// Intents that complement each other (A seeking B, B seeking A)
const COMPLEMENTARY_INTENTS: Record<string, string[]> = {
  be_heard:            ["listen", "deep_talk"],
  listen:              ["be_heard", "casual_chat", "deep_talk"],
  distract_me:         ["casual_chat", "distract_me"],
  deep_talk:           ["be_heard", "listen", "deep_talk"],
  casual_chat:         ["casual_chat", "listen", "distract_me", "meet_someone_similar"],
  meet_someone_similar:["casual_chat", "meet_someone_similar"],
};

// Emotions that feel similar to each other
const SIMILAR_EMOTIONS: Record<string, string[]> = {
  lonely:      ["sad", "calm"],
  calm:        ["hopeful", "curious"],
  annoyed:     ["overwhelmed"],
  overwhelmed: ["annoyed", "sad"],
  playful:     ["hopeful", "curious"],
  curious:     ["playful", "calm"],
  hopeful:     ["calm", "playful", "curious"],
  sad:         ["lonely", "overwhelmed"],
};

// Adjacent energy levels
const ADJACENT_ENERGY: Record<string, string[]> = {
  drained: ["normal"],
  normal:  ["drained", "wired"],
  wired:   ["normal"],
};

function scoreIntake(mine: any, theirs: any): number {
  // User hasn't set a mood yet — base score so all bots still appear for discovery
  if (!mine) return 0.30;
  // User has a mood but this bot has no intake configured — not a match
  if (!theirs) return 0;

  let score = 0;

  if (mine.intent && theirs.intent) {
    if (mine.intent === theirs.intent) {
      score += W.intent * 0.70;                              // same intent
    } else if (COMPLEMENTARY_INTENTS[mine.intent]?.includes(theirs.intent)) {
      score += W.intent;                                      // complementary intent (best)
    } else {
      score += W.intent * 0.20;                              // unrelated intent
    }
  }

  if (mine.emotion && theirs.emotion) {
    if (mine.emotion === theirs.emotion) {
      score += W.emotion;
    } else if (SIMILAR_EMOTIONS[mine.emotion]?.includes(theirs.emotion)) {
      score += W.emotion * 0.50;
    }
  }

  if (mine.energy && theirs.energy) {
    if (mine.energy === theirs.energy) {
      score += W.energy;
    } else if (ADJACENT_ENERGY[mine.energy]?.includes(theirs.energy)) {
      score += W.energy * 0.50;
    }
  }

  if (mine.topic_hint && theirs.topic_hint && mine.topic_hint === theirs.topic_hint) {
    score += W.topic;
  }

  if (mine.locale && theirs.locale && mine.locale === theirs.locale) {
    score += W.locale;
  }

  const targetLanguage = normalizeLearningLanguageCode(mine.target_language_code);
  if (targetLanguage) {
    const candidateNative = normalizeLearningLanguageCode(theirs.native_language_code);
    const candidateTarget = normalizeLearningLanguageCode(theirs.target_language_code);
    if (candidateNative === targetLanguage) {
      score += LANGUAGE_MATCH_BONUS;
    } else if (candidateTarget === targetLanguage) {
      score += LANGUAGE_MATCH_BONUS * 0.55;
    }
  }

  return Math.min(Math.round(score * 1000) / 1000, 1.0);
}

const normalizeLocale = (value: unknown): string => {
  const code = String(value || "").trim().toLowerCase();
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

/** Return translated displayname/tagline for the requested locale, falling back to base profile */
function resolvedField(profile: any, field: string, locale: string): string | null {
  const translations: any[] = profile.profile_translations || [];
  const exact = translations.find((t: any) => t.locale === locale);
  if (exact?.[field]) return exact[field];
  const en = translations.find((t: any) => t.locale === "en");
  if (en?.[field]) return en[field];
  return profile[field] ?? null;
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  if (!user) throw createError({ statusCode: 401, message: "Unauthorized" });

  const locale = normalizeLocale(getQuery(event).locale);
  const supabase = await getServiceRoleClient(event);
  const onlineCutoff = new Date(Date.now() - ONLINE_WINDOW_MS).toISOString();

  // 1. Fetch requesting user's own intake
  const { data: myIntakeRow } = await supabase
    .from("match_intakes_latest")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const myLanguagePreferenceMap = await fetchProfileLanguagePreferenceMap(
    supabase,
    [user.id]
  );
  const myIntake = withLanguagePreferenceFallback(
    myIntakeRow,
    myLanguagePreferenceMap.get(user.id)
  );

  // 2. Fetch all other users' intakes (exclude self)
  const { data: allIntakes } = await supabase
    .from("match_intakes_latest")
    .select("user_id, emotion, intent, energy, topic_hint, locale, native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode")
    .neq("user_id", user.id);

  const intakeByUserId = new Map<string, any>(
    (allIntakes || []).map((row: any) => [row.user_id, row])
  );

  const { data: allLanguagePreferences } = await supabase
    .from("profile_language_preferences_active")
    .select("user_id, native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode, source")
    .neq("user_id", user.id);

  const languagePreferenceByUserId = new Map<string, any>(
    (allLanguagePreferences || []).map((row: any) => [row.user_id, row])
  );

  // 3. Determine which users are currently online (presence covers honey bots too)
  const [presenceRes, profilesRes, forcedOnlineRes] = await Promise.all([
    supabase
      .from("presence")
      .select("user_id")
      .gte("last_seen_at", onlineCutoff),
    supabase
      .from("profiles")
      .select("user_id")
      .gte("last_active", onlineCutoff)
      .eq("is_ai", false),
    supabase
      .from("profiles")
      .select("user_id")
      .eq("force_online", true),
  ]);

  const onlineUserIds = new Set<string>([
    ...(presenceRes.data || []).map((r: any) => r.user_id),
    ...(profilesRes.data || []).map((r: any) => r.user_id),
    ...(forcedOnlineRes.data || []).map((r: any) => r.user_id),
  ]);
  onlineUserIds.delete(user.id);

  // 4. Fetch display profiles — real users AND honey bots (they appear as real users)
  const candidateIds = [
    ...new Set([
      ...intakeByUserId.keys(),
      ...languagePreferenceByUserId.keys(),
    ]),
  ];
  const profilesByUserId = new Map<string, any>();

  if (candidateIds.length > 0) {
    // Identify honey bot profile IDs among candidates
    const { data: honeyBots } = await supabase
      .from("ai_personas")
      .select("profile_user_id")
      .eq("is_active", true)
      .eq("honey_enabled", true)
      .in("profile_user_id", candidateIds);

    const honeyBotIds = new Set<string>(
      (honeyBots || []).map((h: any) => h.profile_user_id).filter(Boolean)
    );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, displayname, avatar_url, tagline, preferred_locale, is_ai, gender_id, agent_enabled, countries:country_id (emoji), profile_translations(locale, displayname, tagline)")
        .in("user_id", candidateIds);

    // Include real users and honey bots; skip other AI profiles
    (profiles || []).forEach((p: any) => {
      if (!p.is_ai || honeyBotIds.has(p.user_id)) {
        profilesByUserId.set(p.user_id, {
          ...p,
          country_emoji: p.countries?.emoji ?? null,
        });
      }
    });
  }

  // 5. Score and split into online / offline buckets
  const online: any[] = [];
  const offline: any[] = [];

  for (const candidateId of candidateIds) {
    const intake = withLanguagePreferenceFallback(
      intakeByUserId.get(candidateId),
      languagePreferenceByUserId.get(candidateId),
      { preferredLocale: profilesByUserId.get(candidateId)?.preferred_locale }
    );
    if (!intake) continue;

    const profile = profilesByUserId.get(candidateId);
    if (!profile) continue; // skip AI profiles that slipped through

    const score = scoreIntake(myIntake, intake);
    const candidate = {
      user_id:       candidateId,
      displayname:   resolvedField(profile, "displayname", locale),
      avatar_url:    profile.avatar_url,
      tagline:       resolvedField(profile, "tagline", locale),
      gender_id:     profile.gender_id ?? null,
      country_emoji: profile.country_emoji ?? null,
      agent_enabled: profile.agent_enabled ?? false,
      score,
      emotion:       intake.emotion,
      intent:        intake.intent,
      energy:        intake.energy,
      topic_hint:    intake.topic_hint,
      native_language_code: intake.native_language_code ?? null,
      target_language_code: intake.target_language_code ?? null,
      target_language_level: intake.target_language_level ?? null,
      correction_preference: intake.correction_preference ?? null,
      language_exchange_mode: intake.language_exchange_mode ?? null,
    };

    if (onlineUserIds.has(candidateId)) {
      online.push(candidate);
    } else {
      offline.push(candidate);
    }
  }

  // Sort each bucket by score descending
  const byScore = (a: any, b: any) => b.score - a.score;
  online.sort(byScore);
  offline.sort(byScore);

  // 6. AI bucket — transparent (non-honey) AI personas only.
  // Honey bots are already in the online/offline buckets above.
  const { data: aiPersonas } = await supabase
    .from("ai_personas")
    .select(`
      persona_key,
      profile:profiles!ai_personas_profile_user_id_fkey (
        user_id,
        displayname,
        avatar_url,
        tagline,
        preferred_locale,
        profile_translations(locale, displayname, tagline)
      )
    `)
    .eq("is_active", true)
    .eq("honey_enabled", false)
    .eq("list_publicly", true);

  const aiPersonaList = (aiPersonas || []).filter((p: any) => p.profile?.user_id);
  const aiProfileIds = aiPersonaList.map((p: any) => p.profile.user_id);

  // Fetch intakes for AI personas so they can be scored like real users
  const aiIntakeMap = new Map<string, any>();
  if (aiProfileIds.length > 0) {
    const { data: aiIntakes } = await supabase
      .from("match_intakes_latest")
      .select("user_id, emotion, intent, energy, topic_hint, locale, native_language_code, target_language_code, target_language_level, correction_preference, language_exchange_mode")
      .in("user_id", aiProfileIds);
    (aiIntakes || []).forEach((row: any) => aiIntakeMap.set(row.user_id, row));
  }

  const aiLanguagePreferenceMap = await fetchProfileLanguagePreferenceMap(
    supabase,
    aiProfileIds
  );

  const ai = aiPersonaList
    .map((p: any) => {
      const intake = withLanguagePreferenceFallback(
        aiIntakeMap.get(p.profile.user_id),
        aiLanguagePreferenceMap.get(p.profile.user_id),
        { preferredLocale: p.profile?.preferred_locale }
      );
      return {
        user_id:     p.profile.user_id,
        displayname: resolvedField(p.profile, "displayname", locale),
        avatar_url:  p.profile.avatar_url,
        tagline:     resolvedField(p.profile, "tagline", locale),
        persona_key: p.persona_key,
        score:       scoreIntake(myIntake, intake),
        native_language_code: intake?.native_language_code ?? null,
        target_language_code: intake?.target_language_code ?? null,
        target_language_level: intake?.target_language_level ?? null,
        correction_preference: intake?.correction_preference ?? null,
        language_exchange_mode: intake?.language_exchange_mode ?? null,
      };
    })
    .filter((a: any) => a.score > 0)
    .sort((a: any, b: any) => b.score - a.score);

  return {
    online:  online.slice(0, 20),
    offline: offline.slice(0, 20),
    ai:      ai.slice(0, 20),
    counts: {
      online:  online.length,
      offline: offline.length,
      ai:      ai.slice(0, 20).length,
    },
    intake: myIntake
      ? {
          emotion:    myIntake.emotion,
          intent:     myIntake.intent,
          energy:     myIntake.energy,
          topic_hint: myIntake.topic_hint,
          locale:     myIntake.locale,
          native_language_code: myIntake.native_language_code,
          target_language_code: myIntake.target_language_code,
          target_language_level: myIntake.target_language_level,
          correction_preference: myIntake.correction_preference,
          language_exchange_mode: myIntake.language_exchange_mode,
        }
      : null,
  };
});
