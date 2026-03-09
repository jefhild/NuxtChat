// server/api/aiChat.post.js
import { getOpenAIClient } from "@/server/utils/openaiGateway";
import mustache from "mustache";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const END_CHAT_TOKEN = "__END_CHAT__";

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

const normalizeCapability = (value) => {
  const v = String(value || "").trim().toLowerCase();
  return ["editorial", "counterpoint", "honey"].includes(v) ? v : null;
};

const resolveCapability = (requested, persona, allowHoney = false) => {
  const req = normalizeCapability(requested);
  if (req === "honey" && allowHoney && persona?.honey_enabled) return "honey";
  if (req === "honey" && !allowHoney) return null;
  if (req === "counterpoint" && persona?.counterpoint_enabled) return "counterpoint";
  if (req === "editorial" && persona?.editorial_enabled) return "editorial";
  if (persona?.counterpoint_enabled) return "counterpoint";
  if (persona?.editorial_enabled) return "editorial";
  return null;
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
        "id, persona_key, profile_user_id, model, temperature, top_p, presence_penalty, frequency_penalty, max_response_tokens, max_history_messages, system_prompt_template, response_style_template, parameters, editorial_enabled, counterpoint_enabled, honey_enabled, honey_delay_min_ms, honey_delay_max_ms, editorial_system_prompt_template, editorial_response_style_template, counterpoint_system_prompt_template, counterpoint_response_style_template, honey_system_prompt_template, honey_response_style_template, profile:profiles!ai_personas_profile_user_id_fkey(displayname)"
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
    const localeFromHeader = event.node?.req?.headers?.["accept-language"] || "";
    const closeLines = getCloseLinesForLocale(locale || localeFromHeader);
    const resolvedCapability = resolveCapability(
      capability,
      persona,
      allowHoneyCapability
    );
    const requestedCapability = normalizeCapability(capability);
    const isHoneyMode =
      resolvedCapability === "honey" ||
      requestedCapability === "honey" ||
      !!persona?.honey_enabled;
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


    const response = await openai.chat.completions.create({
      model: persona.model || "gpt-4o-mini",
      messages: [
        { role: "system", content: fullPrompt },
      { role: "user", content: userMessage },
      ],
      temperature: persona.temperature ?? 0.7,
      top_p: persona.top_p ?? 1,
      presence_penalty: persona.presence_penalty ?? 0,
      frequency_penalty: persona.frequency_penalty ?? 0,
      max_tokens: persona.max_response_tokens ?? 600,
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
