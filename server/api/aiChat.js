// server/api/aiChat.post.js
import { getOpenAIClient } from "@/server/utils/openaiGateway";
import mustache from "mustache";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  getLanguagePracticePersonaConfig,
} from "@/utils/languagePracticePersona";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const END_CHAT_TOKEN = "__END_CHAT__";
const LANGUAGE_LABELS = {
  en: "English",
  fr: "French",
  ru: "Russian",
  zh: "Chinese",
};
const DEFAULT_LANGUAGE_PRACTICE_SYSTEM_PROMPT = `
You are a language-practice assistant.

Your primary job is to help the learner practice the target language through short, natural conversation with gentle teaching support.

Core behavior:
- Stay in the target language unless a very short clarification in the support language is truly necessary.
- Act like a tutor, conversation partner, or native helper depending on the session context.
- Be practical and instructional when the learner makes obvious mistakes.
- Prefer short, clear, usable replies over abstract or emotionally reflective responses.
- Do not default to therapy-style mirroring, emotional coaching, flirting, or vague reassurance.
- When the learner asks whether you can teach, coach, or act like a teacher, answer yes and immediately behave that way.
`.trim();
const DEFAULT_LANGUAGE_PRACTICE_RESPONSE_STYLE =
  "Short, clear, encouraging, target-language-first, and coach-like. Prefer correcting obvious mistakes briefly before continuing the conversation.";
const normalizeLanguagePracticeCode = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return null;
  return normalizeLocale(raw);
};

const normalizeLocale = (value) => {
  const v = String(value || "").trim().toLowerCase();
  if (v.startsWith("fr")) return "fr";
  if (v.startsWith("ru")) return "ru";
  if (v.startsWith("zh")) return "zh";
  return "en";
};

const getCloseLinesForLocale = (locale) => {
  const l = normalizeLocale(locale);
  if (l === "fr") {
    return {
      default: "Je dois y aller pour le moment. On reprend plus tard.",
      incoherent:
        "Je ne suis pas sûr d'avoir compris. Je vais y aller pour l'instant, on reprendra plus tard.",
    };
  }
  if (l === "ru") {
    return {
      default: "Мне пора бежать. Давай продолжим позже.",
      incoherent:
        "Похоже, я не совсем понял. Я пока выйду, продолжим позже.",
    };
  }
  if (l === "zh") {
    return {
      default: "我先去忙啦，我们晚点再聊。",
      incoherent: "我有点没看懂这条消息，我先撤啦，晚点再聊。",
    };
  }
  return {
    default: "I've got to run for now. Let's pick this up later.",
    incoherent:
      "I'm not sure I caught that. I'll head out for now, we can pick this up later.",
  };
};

const isLikelyIncoherentMessage = (value) => {
  const text = String(value || "").trim().toLowerCase();
  if (!text) return true;

  const lettersOnly = text.replace(/[^a-z]/g, "");
  const words = text.split(/\s+/).filter(Boolean);
  const punctuationOnly = text.replace(/[a-z0-9\s]/gi, "");
  const alphaWords = words
    .map((w) => w.replace(/[^a-z]/g, ""))
    .filter(Boolean);
  const keyboardMashPattern = /(asdf|sdf|qwer|wer|zxcv|xcv|hjkl|jkl|lkj)/i;
  const isLikelyGibberishWord = (w) => {
    if (w.length < 4) return false;
    const vowels = (w.match(/[aeiouy]/g) || []).length;
    const vowelRatio = vowels / Math.max(1, w.length);
    const hasLongConsonantRun = /[bcdfghjklmnpqrstvwxyz]{4,}/i.test(w);
    const hasWeirdRepetition = /(..+)\1/.test(w);
    const hasKeyboardMash = keyboardMashPattern.test(w);
    return (
      hasKeyboardMash ||
      hasLongConsonantRun ||
      (w.length >= 7 && vowelRatio < 0.28) ||
      (w.length >= 8 && hasWeirdRepetition)
    );
  };
  const hasLongRepeatedChar = /(.)\1{4,}/.test(text);
  const singleWordNoVowels =
    words.length === 1 &&
    lettersOnly.length >= 7 &&
    !/[aeiouy]/.test(lettersOnly);
  const mostlyPunctuation =
    punctuationOnly.length >= 4 && lettersOnly.length <= 2;
  const tooFewLetters = lettersOnly.length <= 1 && text.length >= 3;
  const gibberishWordCount = alphaWords.filter(isLikelyGibberishWord).length;
  const gibberishRatio =
    alphaWords.length > 0 ? gibberishWordCount / alphaWords.length : 0;
  const multiWordMostlyGibberish =
    alphaWords.length >= 2 && gibberishRatio >= 0.6;
  const singleLongGibberish =
    alphaWords.length === 1 && isLikelyGibberishWord(alphaWords[0]);

  return (
    hasLongRepeatedChar ||
    singleWordNoVowels ||
    mostlyPunctuation ||
    tooFewLetters ||
    multiWordMostlyGibberish ||
    singleLongGibberish
  );
};

const escapeRegExp = (value) =>
  String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const isLikelyTranslationRequest = ({
  message,
  targetLanguageCode,
  targetLanguageLabel,
}) => {
  const text = String(message || "").trim().toLowerCase();
  if (!text) return false;

  const targetCode = normalizeLanguagePracticeCode(targetLanguageCode);
  const targetLabel = String(targetLanguageLabel || describeLanguageCode(targetCode))
    .trim()
    .toLowerCase();
  const languageTokens = Array.from(
    new Set(
      [targetCode, targetLabel]
        .filter(Boolean)
        .flatMap((token) => String(token).split(/\s+/))
        .filter(Boolean)
    )
  );
  const languagePattern = languageTokens.length
    ? languageTokens.map((token) => escapeRegExp(token)).join("|")
    : "language";

  const translationPatterns = [
    new RegExp(`\\bhow do i say\\b`, "i"),
    new RegExp(`\\bhow to say\\b`, "i"),
    new RegExp(`\\bhow would you say\\b`, "i"),
    new RegExp(`\\bwhat(?:'s| is) .*\\bin (${languagePattern})\\b`, "i"),
    new RegExp(`\\btranslate .*\\binto (${languagePattern})\\b`, "i"),
    new RegExp(`\\btranslate .*\\bto (${languagePattern})\\b`, "i"),
    new RegExp(`\\bwhat do i want to say in (${languagePattern})\\b`, "i"),
  ];

  if (translationPatterns.some((pattern) => pattern.test(text))) return true;

  const shortQuestion =
    text.endsWith("?") &&
    text.split(/\s+/).filter(Boolean).length <= 8 &&
    /^[a-z0-9\s,'".?!-]+$/i.test(text);
  return shortQuestion;
};

const normalizeCapability = (value) => {
  const v = String(value || "").trim().toLowerCase();
  return ["editorial", "counterpoint", "honey", "language_practice"].includes(v)
    ? v
    : null;
};

const resolveCapability = (
  requested,
  persona,
  allowHoney = false,
  languagePracticeConfig = null,
  languagePracticeSession = null
) => {
  const req = normalizeCapability(requested);
  if (
    req === "language_practice" &&
    languagePracticeConfig?.enabled &&
    languagePracticeSession
  ) {
    return "language_practice";
  }
  if (req === "honey" && allowHoney && persona?.honey_enabled) return "honey";
  if (req === "honey" && !allowHoney) return null;
  if (req === "counterpoint" && persona?.counterpoint_enabled) return "counterpoint";
  if (req === "editorial" && persona?.editorial_enabled) return "editorial";
  if (persona?.counterpoint_enabled) return "counterpoint";
  if (persona?.editorial_enabled) return "editorial";
  return null;
};

const describeLanguageCode = (code) => {
  const normalized = normalizeLanguagePracticeCode(code);
  return normalized ? LANGUAGE_LABELS[normalized] || normalized : "Unknown";
};

const describeCorrectionPreference = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  if (!normalized) return "light corrections";
  return normalized;
};

const describeExchangeMode = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, " ");
  return normalized || "practice only";
};

const supportsLanguagePracticeSession = (config, session) => {
  if (!config?.enabled || !session) return false;

  const targetLanguage = normalizeLanguagePracticeCode(
    session.target_language_code
  );
  const nativeLanguage = session.learner_native_language_code
    ? normalizeLanguagePracticeCode(session.learner_native_language_code)
    : null;
  const level = String(session.target_language_level || "")
    .trim()
    .toLowerCase();

  if (
    Array.isArray(config.supported_target_languages) &&
    config.supported_target_languages.length &&
    (!targetLanguage ||
      !config.supported_target_languages.includes(targetLanguage))
  ) {
    return false;
  }

  if (
    nativeLanguage &&
    Array.isArray(config.supported_native_languages) &&
    config.supported_native_languages.length &&
    !config.supported_native_languages.includes(nativeLanguage)
  ) {
    return false;
  }

  if (
    level &&
    Array.isArray(config.supported_levels) &&
    config.supported_levels.length &&
    !config.supported_levels.includes(level)
  ) {
    return false;
  }

  return true;
};

const supportsMaxCompletionTokens = (model) => {
  const normalized = String(model || "").trim().toLowerCase();
  return normalized.startsWith("gpt-5");
};

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const isDev = process.env.NODE_ENV !== "production";
  const query = getQuery(event);
  const debug = isDev || query.debug === "1";

  try {
    const { client: openai, apiKey } = getOpenAIClient({
      runtimeConfig: config,
    });
    if (!apiKey || !openai) {
      console.error("[aiChat] Missing OPENAI_API_KEY");
      throw createError({
        statusCode: 500,
        statusMessage: "OPENAI_API_KEY misconfigured",
      });
    }

    const body = await readBody(event);
    const {
      userMessage, // string (required)
      userGender, // string | null
      userName, // string | null
        assistantTurn, // number | null
        locale, // string | null
        aiUser, // string (persona key or display name, required)
      userAge, // number | null
      history, // [{ sender, content }]
      replyTo, // string | null
      extra_system, // string | null
      capability, // string | null
    } = body || {};

    if (!userMessage) return { success: false, error: "Missing userMessage" };
    if (!aiUser) return { success: false, error: "Missing aiUser" };

    const slugify = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const personaCandidates = (() => {
      const raw = String(aiUser || "").trim();
      const lowered = raw.toLowerCase();
      const slug = slugify(raw);
      const deduped = new Set(
        [slug, lowered, raw].filter((value) => !!value && value.length > 1)
      );
      return Array.from(deduped);
    })();

    if (!personaCandidates.length) {
      return { success: false, error: "Invalid persona identifier" };
    }

    const supabase = await serverSupabaseClient(event);
    const caller = await serverSupabaseUser(event).catch(() => null);
    const { data: personas, error: personaErr } = await supabase
      .from("ai_personas")
      .select(
        "id, persona_key, profile_user_id, model, temperature, top_p, presence_penalty, frequency_penalty, max_response_tokens, max_history_messages, system_prompt_template, response_style_template, parameters, metadata, editorial_enabled, counterpoint_enabled, honey_enabled, honey_delay_min_ms, honey_delay_max_ms, editorial_system_prompt_template, editorial_response_style_template, counterpoint_system_prompt_template, counterpoint_response_style_template, honey_system_prompt_template, honey_response_style_template, profile:profiles!ai_personas_profile_user_id_fkey(displayname)"
      )
      .in("persona_key", personaCandidates)
      .eq("is_active", true)
      .limit(1);

    const persona = Array.isArray(personas) ? personas[0] : personas;

    // console.log("[aiChat] persona:", persona);
    console.log("[aiChat] auth user:", caller?.id || null);

    
    if (personaErr) {
      console.error("[aiChat] personaErr:", {
        code: personaErr.code, details: personaErr.details, hint: personaErr.hint, message: personaErr.message
      });
      console.log("[aiChat] caller:", caller ? { id: caller.id, role: "authenticated" } : { role: "anon" });
    }

    if (!persona) {
      console.warn("[aiChat] Persona missing/inactive:", personaCandidates);
      throw createError({
        statusCode: 404,
        statusMessage: `Persona not found: ${aiUser}`,
      });
    }

    // Honey capability is available for anonymous/no-session users,
    // but blocked for fully authenticated users.
    const allowHoneyCapability = !caller || !!caller?.is_anonymous;
    const languagePracticeConfig = getLanguagePracticePersonaConfig(
      persona?.metadata
    );
    let languagePracticeSession = null;
    if (
      normalizeCapability(capability) === "language_practice" &&
      caller?.id &&
      languagePracticeConfig.enabled &&
      persona?.profile_user_id
    ) {
      const serviceSupabase = await getServiceRoleClient(event);
      const { data: activeSession, error: sessionError } = await serviceSupabase
        .from("language_practice_sessions")
        .select("*")
        .eq("status", "active")
        .or(
          `and(learner_user_id.eq.${caller.id},partner_user_id.eq.${persona.profile_user_id}),and(learner_user_id.eq.${persona.profile_user_id},partner_user_id.eq.${caller.id})`
        )
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (sessionError) {
        console.warn("[aiChat] language practice session lookup failed:", sessionError);
      } else if (
        supportsLanguagePracticeSession(languagePracticeConfig, activeSession)
      ) {
        languagePracticeSession = activeSession;
      }
    }
    const localeFromHeader = event.node?.req?.headers?.["accept-language"] || "";
    const closeLines = getCloseLinesForLocale(locale || localeFromHeader);
    const resolvedCapability = resolveCapability(
      capability,
      persona,
      allowHoneyCapability,
      languagePracticeConfig,
      languagePracticeSession
    );
    const requestedCapability = normalizeCapability(capability);
    const isHoneyMode =
      resolvedCapability === "honey" ||
      requestedCapability === "honey";
    const systemTemplate =
      resolvedCapability === "honey"
        ? persona.honey_system_prompt_template || persona.system_prompt_template || ""
        : resolvedCapability === "counterpoint"
        ? persona.counterpoint_system_prompt_template ||
          persona.system_prompt_template ||
          ""
        : resolvedCapability === "editorial"
        ? persona.editorial_system_prompt_template ||
          persona.system_prompt_template ||
          ""
        : resolvedCapability === "language_practice"
        ? languagePracticeConfig.system_prompt_template ||
          DEFAULT_LANGUAGE_PRACTICE_SYSTEM_PROMPT
        : persona.system_prompt_template || "";

    const styleTemplate =
      resolvedCapability === "honey"
        ? persona.honey_response_style_template || persona.response_style_template || ""
        : resolvedCapability === "counterpoint"
        ? persona.counterpoint_response_style_template ||
          persona.response_style_template ||
          ""
        : resolvedCapability === "editorial"
        ? persona.editorial_response_style_template ||
          persona.response_style_template ||
          ""
        : resolvedCapability === "language_practice"
        ? languagePracticeConfig.response_style_template ||
          DEFAULT_LANGUAGE_PRACTICE_RESPONSE_STYLE
        : persona.response_style_template || "";

    if (resolvedCapability === "honey") {
      const minDelay = Math.max(0, Number(persona.honey_delay_min_ms ?? 1000));
      const maxDelay = Math.max(minDelay, Number(persona.honey_delay_max_ms ?? 10000));
      const jitter = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      await sleep(jitter);
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-(persona.max_history_messages ?? 10))
      : [];

    const personaName =
      persona?.profile?.displayname ||
      persona?.persona_key ||
      String(aiUser || "").trim() ||
      "Assistant";
    const parsedAssistantTurn = Number(assistantTurn);
    const assistantTurnsFromHistory = safeHistory.reduce((count, h) => {
      const sender = String(h?.sender ?? "").trim().toLowerCase();
      if (!sender) return count;
      if (["you", "user", "me", "human"].includes(sender)) return count;
      return count + 1;
    }, 0);
    const resolvedAssistantTurn =
      Number.isFinite(parsedAssistantTurn) && parsedAssistantTurn > 0
        ? Math.floor(parsedAssistantTurn)
        : assistantTurnsFromHistory + 1;
    const mustClose = resolvedAssistantTurn >= 7;
    const incoherentUserMessage = isLikelyIncoherentMessage(userMessage);

    if (isHoneyMode && mustClose) {
      return { success: true, aiResponse: closeLines.default, chatEnded: true };
    }
    if (isHoneyMode && incoherentUserMessage) {
      return {
        success: true,
        aiResponse: closeLines.incoherent,
        chatEnded: true,
      };
    }

    const vars = {
      personaName,
      userName: userName ?? "",
      userGender: userGender ?? "",
      userAge: userAge ?? "",
      assistantTurn: resolvedAssistantTurn,
      mustClose,
      targetLanguageCode:
        languagePracticeSession?.target_language_code ?? "",
      targetLanguageLabel: describeLanguageCode(
        languagePracticeSession?.target_language_code
      ),
      learnerNativeLanguageCode:
        languagePracticeSession?.learner_native_language_code ?? "",
      learnerNativeLanguageLabel: describeLanguageCode(
        languagePracticeSession?.learner_native_language_code
      ),
      targetLanguageLevel:
        languagePracticeSession?.target_language_level ?? "",
      correctionPreference:
        languagePracticeSession?.correction_preference ??
        languagePracticeConfig.default_correction_preference,
      correctionPreferenceLabel: describeCorrectionPreference(
        languagePracticeSession?.correction_preference ??
          languagePracticeConfig.default_correction_preference
      ),
      exchangeMode:
        languagePracticeSession?.language_exchange_mode ??
        languagePracticeConfig.default_exchange_mode,
      exchangeModeLabel: describeExchangeMode(
        languagePracticeSession?.language_exchange_mode ??
          languagePracticeConfig.default_exchange_mode
      ),
      languagePracticeAssistantRole: languagePracticeConfig.assistant_role,
    };

    // Render the base system prompt template
    let promptBase = mustache.render(systemTemplate, vars);
    if (extra_system && typeof extra_system === "string") {
      promptBase = `${promptBase}\n${extra_system.trim()}`;
    }
    if (styleTemplate) {
      const style = mustache.render(
        String(styleTemplate),
        vars
      ).trim();
      if (style) {
        promptBase = `${promptBase}\nResponse style: ${style}`;
      }
    }
    if (resolvedCapability === "language_practice" && languagePracticeSession) {
      const correctionPreference =
        languagePracticeSession.correction_preference ??
        languagePracticeConfig.default_correction_preference;
      const autoCorrectionPolicy =
        correctionPreference === "active_corrections"
          ? "Always correct clear grammar, wording, agreement, or spelling mistakes from the learner's latest message before you continue. Start your reply with a short corrected version in the target language, optionally add one brief explanation, then continue naturally in the target language."
          : correctionPreference === "light_corrections"
          ? "When the learner makes an obvious mistake, start with a short corrected version of what they meant in the target language, then continue the conversation. Do this automatically for clear mistakes, but keep it light and do not correct every tiny issue."
          : "Do not proactively correct mistakes. Only correct when the learner explicitly asks for help.";
      promptBase = `${promptBase}\nLanguage practice mode is active.
- These language-practice rules override any conflicting persona instructions.
- Act as a ${languagePracticeConfig.assistant_role.replace(/_/g, " ")}.
- The learner is practicing ${describeLanguageCode(
        languagePracticeSession.target_language_code
      )} (${languagePracticeSession.target_language_code}).
- The learner's stronger support language is ${describeLanguageCode(
        languagePracticeSession.learner_native_language_code
      )} (${languagePracticeSession.learner_native_language_code || "n/a"}).
- Learner level: ${languagePracticeSession.target_language_level || "unsure"}.
- Correction preference: ${describeCorrectionPreference(
        correctionPreference
      )}.
- Exchange mode: ${describeExchangeMode(
        languagePracticeSession.language_exchange_mode ??
          languagePracticeConfig.default_exchange_mode
      )}.
Behavior requirements:
- Reply in the target language by default. Only use the support language for a very short clarification when absolutely necessary.
- Prioritize being a language coach and practice partner, not a therapist, flirt bot, or reflective listener.
- Keep the tone encouraging, natural, and conversational.
- Match difficulty to the learner level.
- ${autoCorrectionPolicy}
- If you correct, show the improved phrasing in the target language and then continue the conversation.
- If the learner's latest message has an obvious mistake, do not ignore it and do not only paraphrase their intent.
- For light or active corrections, prefer this structure when needed:
  1. corrected phrase or sentence in the target language
  2. one very short explanation only if it helps
  3. your natural reply or follow-up in the target language
- Avoid generic reflective prompts such as "Does that feel right?", "Does that sound right?", or emotion-coaching responses unless the learner is explicitly talking about feelings.
- If the learner writes in the support language instead of the target language, gently guide them back into the target language.
- If the learner writes in the support language asking what they want to say in the target language, treat it as a translation request, not a normal content question.
- For translation-style requests, give the target-language phrase first. Do not answer the literal topic question unless the learner separately asks for that information.
- Example: if the learner practicing French writes "how do I make butter?", reply with the French phrasing for that idea, not instructions for making butter.
- Prefer continuing the conversation over turning every reply into a lesson.`;
      if (resolvedAssistantTurn === 1) {
        promptBase = `${promptBase}
- This is your first reply in this language-practice session. Briefly introduce the practice in ${describeLanguageCode(
          languagePracticeSession.target_language_code
        )} and invite the learner to continue in that language.`;
      }
      if (
        isLikelyTranslationRequest({
          message: userMessage,
          targetLanguageCode: languagePracticeSession.target_language_code,
          targetLanguageLabel: describeLanguageCode(
            languagePracticeSession.target_language_code
          ),
        })
      ) {
        promptBase = `${promptBase}
- The learner's latest message looks like a translation request written in the support language.
- Your first line must be the target-language phrasing they can say.
- After that, you may add one short variant or one brief note, still in the target language.
- Do not answer the underlying factual question unless the learner explicitly asks for that after the translation.`;
      }
    }
    if (isHoneyMode) {
      promptBase = `${promptBase}\nIncoherence handling policy: If the user's latest message is nonsense OR the user has gone off-topic/incoherent for 2 or more recent turns, end the chat immediately by replying with exactly ${END_CHAT_TOKEN} and nothing else.`;
    }
    if (mustClose) {
      promptBase = `${promptBase}\nConversation control: mustClose=true. Send one short, warm closing line now. Do not ask a question. End the conversation in this reply.`;
    }

    // Keep your original “append history to system” approach
    let fullPrompt = `${promptBase}\nHere are the previous messages:\n`;
    for (const h of safeHistory) {
      const sender = (h?.sender ?? "Unknown").toString();
      const content = (h?.content ?? "").toString();
      fullPrompt += `${sender}: ${content}\n`;
    }
    if (replyTo) {
      fullPrompt += `\nNote: The user is replying to this message: "${String(
        replyTo
      )}"\n`;
    }

    const model = persona.model || "gpt-4o-mini";
    const maxResponseTokens = persona.max_response_tokens ?? 600;
    const tokenLimitField = supportsMaxCompletionTokens(model)
      ? { max_completion_tokens: maxResponseTokens }
      : { max_tokens: maxResponseTokens };

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: fullPrompt },
      { role: "user", content: userMessage },
      ],
      temperature: persona.temperature ?? 0.7,
      top_p: persona.top_p ?? 1,
      presence_penalty: persona.presence_penalty ?? 0,
      frequency_penalty: persona.frequency_penalty ?? 0,
      ...tokenLimitField,
      ...(persona.parameters && typeof persona.parameters === "object"
        ? persona.parameters
        : {}),
    });

    const aiResponseRaw = response?.choices?.[0]?.message?.content ?? "";
    const aiResponse = String(aiResponseRaw).trim();
    if (isHoneyMode && aiResponse === END_CHAT_TOKEN) {
      return { success: true, aiResponse: closeLines.default, chatEnded: true };
    }
    if (debug) {
      // console.log("[aiChat] AI response preview:", aiResponse.slice(0, 300));
    }

    return { success: true, aiResponse };
  } catch (err) {
    console.error("[aiChat] error:", err);
    throw err; // Let Nuxt return proper status code/message
  }
});
