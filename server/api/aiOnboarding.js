// server/api/aiOnboarding.js
import { defineEventHandler, readBody } from "h3";
import OpenAI from "openai";
import { useDb } from "@/composables/useDB";

const config = useRuntimeConfig();
const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY; // belt & suspenders
const model = config.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
const preferAI = !!(config.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
const canUseAI = !!apiKey; // true if a private key is available on the server

const STRINGS = {
  en: {
    consentPrompt: "Do you confirm you are 18+ and accept the terms to continue?",
    consentThanks: "Thanks! Let’s set up your profile.",
    consentAskName: "What display name should we show?",
    consentNudge: "No problem. Say “yes” when you’re ready to continue, and we’ll proceed.",
    askAge: "Great! What's your age? (18+ only)",
    askAgeSimple: "Please enter a valid age. What's your age?",
    askGenderShort: "Which gender fits you best?",
    askGenderOpen: "How do you identify your gender?",
    genderMale: "Male",
    genderFemale: "Female",
    genderOther: "Other",
    askBioShort:
      "Almost done! Please share a short bio (1–280 chars, one paragraph).",
    askBio: "Write a short bio (1–2 sentences).",
    askBioAlt: "Please keep your bio between 1 and 280 characters, one paragraph.",
    askBioShorter: "Please keep your bio under 300 characters.",
    askNameValidation: "Please choose a longer display name.",
    askNameTaken: "That display name is already taken. Try another.",
    finalizePrompt: "Shall I finalize your profile now?",
  },
  fr: {
    consentPrompt:
      "Confirmez-vous avoir 18 ans ou plus et accepter les conditions pour continuer ?",
    consentThanks: "Merci ! Configurons votre profil.",
    consentAskName: "Quel nom d'affichage souhaitons-nous utiliser ?",
    consentNudge:
      "Pas de souci. Dites « oui » quand vous serez prêt, et nous continuerons.",
    askAge: "Super ! Quel est votre âge ? (18 ans et +)",
    askAgeSimple: "Veuillez saisir un âge valide. Quel est votre âge ?",
    askGenderShort: "Quel genre vous correspond le mieux ?",
    askGenderOpen: "Comment vous identifiez-vous ?",
    genderMale: "Homme",
    genderFemale: "Femme",
    genderOther: "Autre",
    askBioShort:
      "Presque terminé ! Partagez une courte bio (1–280 caractères, un seul paragraphe).",
    askBio: "Écrivez une courte bio (1–2 phrases).",
    askBioAlt:
      "Veuillez garder votre bio entre 1 et 280 caractères, un seul paragraphe.",
    askBioShorter: "Veuillez garder votre bio sous 300 caractères.",
    askNameValidation: "Veuillez choisir un nom d’affichage plus long.",
    askNameTaken: "Ce nom d’affichage est déjà utilisé. Essayez-en un autre.",
    finalizePrompt: "Dois-je finaliser votre profil maintenant ?",
  },
  ru: {
    consentPrompt:
      "Подтверждаете, что вам 18+ и вы принимаете условия, чтобы продолжить?",
    consentThanks: "Спасибо! Давайте настроим профиль.",
    consentAskName: "Какое отображаемое имя мы покажем?",
    consentNudge:
      "Хорошо. Скажите «да», когда будете готовы продолжить.",
    askAge: "Отлично! Сколько вам лет? (18+)",
    askAgeSimple: "Пожалуйста, укажите корректный возраст. Сколько вам лет?",
    askGenderShort: "Какой пол вам подходит больше всего?",
    askGenderOpen: "Как вы себя идентифицируете?",
    genderMale: "Мужской",
    genderFemale: "Женский",
    genderOther: "Другое",
    askBioShort:
      "Почти готово! Напишите короткое био (1–280 символов, один абзац).",
    askBio: "Напишите короткое био (1–2 предложения).",
    askBioAlt:
      "Сохраните био в пределах 1–280 символов, один абзац.",
    askBioShorter: "Пожалуйста, держите био короче 300 символов.",
    askNameValidation: "Пожалуйста, выберите более длинное отображаемое имя.",
    askNameTaken: "Это отображаемое имя уже занято. Попробуйте другое.",
    finalizePrompt: "Завершить профиль сейчас?",
  },
  zh: {
    consentPrompt: "你确认已年满18岁并接受条款后继续吗？",
    consentThanks: "谢谢！让我们开始设置你的资料。",
    consentAskName: "我们该显示什么昵称？",
    consentNudge: "没关系。准备好时说“是”，我们就继续。",
    askAge: "很好！你多大了？（需年满18岁）",
    askAgeSimple: "请输入有效年龄。你的年龄是？",
    askGenderShort: "哪个性别最符合你？",
    askGenderOpen: "你的性别是？",
    genderMale: "男",
    genderFemale: "女",
    genderOther: "其他",
    askBioShort: "快好了！写一段简介（1–280字符，单段）。",
    askBio: "写一段简短的简介（1–2句话）。",
    askBioAlt: "简介需控制在1–280字符，单段。",
    askBioShorter: "简介请控制在300字符以内。",
    askNameValidation: "请使用更长的显示名称。",
    askNameTaken: "这个显示名称已被占用，请换一个。",
    finalizePrompt: "现在要完成你的资料吗？",
  },
};

const YES_REGEX = {
  en: /^(y|yes|i agree|ok|okay|sure)$/i,
  fr: /^(o|oui|d'accord|daccord|ok|yes)$/i,
  ru: /^(да|ok|хорошо|ладно|согласен|согласна)$/i,
  zh: /^(是|好的|好|行|ok|yes)$/i,
};

const pickLang = (locale = "en") => String(locale || "en").split("-")[0];
const pickStrings = (locale = "en") => STRINGS[pickLang(locale)] || STRINGS.en;
const pickYesRegex = (locale = "en") =>
  YES_REGEX[pickLang(locale)] || YES_REGEX.en;
const genderQuickReplies = (locale = "en") => {
  const strings = pickStrings(locale);
  return [
    strings.genderMale,
    strings.genderFemale,
    strings.genderOther,
  ].filter(Boolean);
};

const pickVariant = (locale = "en", variants = {}) => {
  const lang = pickLang(locale);
  return (
    variants[lang] ||
    variants[lang.split("-")[0]] ||
    variants[lang.slice(0, 2)] ||
    variants.en
  );
};

const DISPLAYNAME_MAX = 40;
const CJK_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af]/;
const countChars = (value) => Array.from(String(value || "")).length;
const normalizeDisplayName = (value) => String(value || "").trim();
const minDisplayNameLength = (value) =>
  CJK_RE.test(String(value || "")) ? 2 : 4;
const isDisplayNameLengthValid = (value) => {
  const len = countChars(value);
  const minLen = minDisplayNameLength(value);
  return len >= minLen && len <= DISPLAYNAME_MAX;
};

async function isDisplayNameTaken(supa, value) {
  if (!supa) return false;
  const cleaned = normalizeDisplayName(value);
  if (!cleaned) return false;
  const { data, error } = await supa
    .from("profiles")
    .select("displayname")
    .ilike("displayname", cleaned)
    .limit(1)
    .maybeSingle();
  if (error && error.code !== "PGRST116") return false;
  return !!data;
}

async function validateDisplayName(supa, value) {
  const cleaned = normalizeDisplayName(value);
  if (!cleaned || !isDisplayNameLengthValid(cleaned)) {
    return { ok: false, reason: "length" };
  }
  const taken = await isDisplayNameTaken(supa, cleaned);
  if (taken) return { ok: false, reason: "taken" };
  return { ok: true, value: cleaned };
}

/**
 * Returns { actions: [...] } where actions can be:
 *  - { type: 'bot_message', text }
 *  - { type: 'set_consent', value: boolean }
 *  - { type: 'set_field', key: 'displayName'|'age'|'genderId'|'bio', value }
 *  - { type: 'finalize' }
 *
 * No messages are persisted here. The client (useOnboardingAi) applies actions
 * to onboardingDraftStore + authStore1, then persists profile on finalize.
 */

async function generateBioFromKeywords({
  apiKey,
  displayname = "",
  age = "",
  gender = "",
  keywords = [],
  locale = "en",
  maxChars = 220,
  tone = "humorous",
}) {
  const keywordList = (arr = []) =>
    arr
      .map((s) => String(s || "").trim())
      .filter(Boolean)
      .slice(0, 6)
      .join(", ");

  const pickBio = (variants) => pickVariant(locale, variants);
  // No key? Return a graceful fallback.
  if (!canUseAI) {
    const kw = keywordList(keywords);
    return pickBio({
      en: kw
        ? `Into ${kw}. Friendly, looking for good chats.`
        : "Coffee-fueled pun appreciator and weekend hiker. If you laugh easily, we’ll get along great.",
      fr: kw
        ? `Fan de ${kw}. Sympa et partant pour discuter.`
        : "Accro aux cafés, amateur de jeux de mots et randonneur du dimanche. Si tu ris facilement, on s’entendra bien.",
      ru: kw
        ? `Увлекаюсь: ${kw}. Открыт(а) к интересным разговорам.`
        : "Люблю кофе, игры слов и походы по выходным. Если ты легко смеёшься — нам по пути.",
      zh: kw
        ? `喜欢：${kw}。性格随和，想找人好好聊聊。`
        : "爱喝咖啡、喜欢冷笑话的周末徒步爱好者。如果你笑点低，我们会很合拍。",
    });
  }

  const openai = new OpenAI({ apiKey });

  const prompt = `
Write a short ${tone} dating-style bio (max ${maxChars} characters).
Language: ${locale}. Keep it playful, specific, no clichés, no hashtags.
Speak in first person.
Use these details if helpful:
- Name: ${displayname}
- Age: ${age}
- Gender: ${gender}
- Keywords: ${keywords.join(", ")}

If the input is inappropriate/hateful, respond with exactly: inappropriate
Return ONLY the bio text, no quotes.
`.trim();

  try {
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let bio = resp.choices?.[0]?.message?.content?.trim() || "";
    if (!bio) {
      bio = pickBio({
        en: "Coffee fan and pun enthusiast, always up for small adventures.",
        fr: "Fan de café et de jeux de mots, toujours partant pour de petites aventures.",
        ru: "Люблю кофе и каламбуры, всегда за небольшие приключения.",
        zh: "热爱咖啡和冷笑话，总是准备好去探索小冒险。",
      });
    } else if (bio.toLowerCase() === "inappropriate") {
      bio = pickBio({
        en: "Let’s keep it friendly—try a different set of keywords?",
        fr: "Je préfère garder mon profil sympathique—on peut essayer avec d’autres mots-clés ?",
        ru: "Давайте оставим профиль дружелюбным — попробуйте другие ключевые слова.",
        zh: "保持友好一点吧，再换些关键词试试？",
      });
    }
    if (bio.length > maxChars) bio = bio.slice(0, maxChars).trim();
    return bio;
  } catch (error) {
    console.error("[aiOnboarding.generateBio] error:", error);
    return pickBio({
      en: "Espresso-fueled optimist seeking a co-pilot for small adventures.",
      fr: "Optimiste à l’espresso, cherche copilote pour petites aventures.",
      ru: "Оптимист на эспрессо в поиске напарника для маленьких приключений.",
      zh: "浓缩咖啡驱动的乐观派，想找个伙伴一起去小冒险。",
    });
  }
}

export default defineEventHandler(async (event) => {
  const {
    messages = [],
    draftSummary,
    missingFields,
    consented,
    isComplete,
    resume,
    locale: localeFromBody,
  } = await readBody(event);

  const localeCode = localeFromBody || "en";
  const strings = pickStrings(localeCode);
  const L = (key) => strings[key] || STRINGS.en[key] || "";
  const yesRegex = pickYesRegex(localeCode);
  const genderReplies = genderQuickReplies(localeCode);
  const genderPromptAction = (text) => ({
    type: "bot_message",
    text,
    quickReplies: genderReplies,
  });
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  let supa = null;
  try {
    supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch {}

  // console.log("[OnboardingAI] incoming body:", {
  //   messages: messages?.map((m) => m.role + ":" + m.content).slice(-3), // last 3 for context
  //   draftSummary,
  //   missingFields,
  //   consented,
  //   isComplete,
  //   resume,
  // });

  // ------------------------------------------------------------------
  // (A) HARD CONSENT FALLBACK — runs BEFORE calling OpenAI
  // ------------------------------------------------------------------
  if (!consented) {
    const said = messages?.[0]?.content?.trim() || "";
    // If no user utterance yet, always ask for consent explicitly

    // console.log("[OnboardingAI] consent branch, said:", said);

    if (!said) {
      return {
        actions: [
          {
            type: "bot_message",
            text: L("consentPrompt"),
          },
        ],
      };
    }
    // Simple yes/no parsing
    if (yesRegex.test(said.trim())) {
      return {
        actions: [
          { type: "set_consent", value: true },
          { type: "bot_message", text: L("consentThanks") },
          { type: "bot_message", text: L("consentAskName") },
        ],
      };
    }
    return {
      actions: [
        {
          type: "bot_message",
          text: L("consentNudge"),
        },
      ],
    };
  }

  // From here on, consent is true.
  const REQUIRED = ["displayName", "age", "genderId", "bio"];

  const state = {
    resume: !!resume,
    consented: true,
    draftSummary: draftSummary || {
      displayName: null,
      age: null,
      genderId: null,
      bio: null,
    },
    missingFields: Array.isArray(missingFields) ? missingFields : [],
    isComplete: !!isComplete,
  };

  // compute once, near where you already have REQUIRED / state / latestUtter:
  const nextRequired = (
    state.missingFields?.length
      ? state.missingFields
      : REQUIRED.filter(
          (k) =>
            !state.draftSummary[k] ||
      (typeof state.draftSummary[k] === "string" &&
        !state.draftSummary[k].trim())
    )
).find((f) => REQUIRED.includes(f));

  const questionForField = (field) => {
    switch (field) {
      case "displayName":
        return L("consentAskName");
      case "age":
        return L("askAge");
      case "genderId":
        return L("askGenderOpen");
      case "bio":
        return L("askBio");
      default:
        return L("finalizePrompt");
    }
  };

  function parseKeywords(input) {
    if (!input || typeof input !== "string") return [];
    // Accept “comma,separated” or space-separated short list
    const raw = input
      .split(/[,\n]/) // commas or new lines
      .map((s) => s.trim())
      .filter(Boolean);

    // If they gave a single blob like "coffee hiking dogs", split on spaces
    const tokens = raw.length === 1 ? raw[0].split(/\s+/) : raw;
    // Keep 2–8 reasonable tokens, de-dup, drop 1-char fillers
    const uniq = [...new Set(tokens.map((t) => t.toLowerCase()))]
      .filter((t) => t.length > 1)
      .slice(0, 8);
    return uniq;
  }

  function normalizeGender(input) {
    const s = String(input ?? "")
      .trim()
      .toLowerCase();
    if (!s) return null;

    // quick exacts
    const map = {
      1: 1,
      male: 1,
      man: 1,
      m: 1,
      guy: 1,
      boy: 1,
      he: 1,
      "he/him": 1,
      masculine: 1,
      "trans man": 1,
      2: 2,
      female: 2,
      woman: 2,
      w: 2,
      gal: 2,
      girl: 2,
      she: 2,
      "she/her": 2,
      feminine: 2,
      "trans woman": 2,
    };
    if (map[s]) return map[s];

    // pronouns / broader buckets
    if (/(^|\b)(he|him)\b/.test(s)) return 1;
    if (/(^|\b)(she|her)\b/.test(s)) return 2;
    if (/(non[-\s]?binary|nb|enby|genderqueer|other|prefer not|none)/.test(s))
      return 3;

    // fallback: if it's literally "other"ish or anything not matched above
    if (/other/.test(s)) return 3;

    return null;
  }

  function isValidBio(s) {
    if (typeof s !== "string") return false;
    const trimmed = s.trim();

    // length bounds & one paragraph
    if (trimmed.length < 8 || trimmed.length > 280) return false;
    if (/\r|\n/.test(trimmed)) return false;

    const lower = trimmed.toLowerCase();

    // reject obvious non-bio patterns
    if (/^\d{1,3}$/.test(lower)) return false; // pure number
    if (/^(1|2|3)$/.test(lower)) return false; // menu choice
    if (/^(male|female|other)$/.test(lower)) return false;
    if (/^i'?m\s+(male|female|other)\b/.test(lower)) return false;
    if (/^\d+\s*yo\b/.test(lower)) return false; // "23 yo"

    // very light "sentence-y" hint: require at least one space
    if (!/\s/.test(trimmed)) return false;

    return true;
  }

  // ---------- FAST PATH (critical) ----------
  const utter = messages?.[0]?.content?.trim?.() || "";

  // ---- Deterministic pre-parse (runs before OpenAI; handles the next required field) ----
  const latestUtter =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.role === "user" && typeof m.content === "string")
      ?.content?.trim() || "";

  const nextField = (
    state.missingFields?.length
      ? state.missingFields
      : REQUIRED.filter(
          (k) =>
            !state.draftSummary[k] ||
            (typeof state.draftSummary[k] === "string" &&
              !state.draftSummary[k].trim())
        )
  ).find((f) => REQUIRED.includes(f));

  if (nextField === "displayName" && latestUtter) {
    const nameCheck = await validateDisplayName(supa, latestUtter);
    if (nameCheck.ok) {
      return {
        actions: [
          { type: "set_field", key: "displayName", value: nameCheck.value },
          { type: "bot_message", text: L("askAge") },
        ],
      };
    }
    return {
      actions: [
        {
          type: "bot_message",
          text: L(nameCheck.reason === "taken" ? "askNameTaken" : "askNameValidation"),
        },
      ],
    };
  }

  // ---- Deterministic pre-parse (ONLY if AI is off/unavailable) ----
  if ((!preferAI || !canUseAI) && latestUtter && nextField) {
    // displayName
    if (nextField === "displayName") {
      const v = latestUtter;
      const nameCheck = await validateDisplayName(supa, v);
      if (nameCheck.ok) {
        return {
          actions: [
            { type: "set_field", key: "displayName", value: nameCheck.value },
            { type: "bot_message", text: L("askAge") },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: L(nameCheck.reason === "taken" ? "askNameTaken" : "askNameValidation"),
          },
        ],
      };
    }

    // age
    if (nextField === "age") {
      const n = parseInt(latestUtter, 10);
      if (!Number.isNaN(n) && n >= 18 && n <= 120) {
        return {
          actions: [
            { type: "set_field", key: "age", value: n },
            {
              ...genderPromptAction(L("askGenderShort")),
            },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: L("askAgeSimple"),
          },
        ],
      };
    }

    // genderId
    if (nextField === "genderId") {
      const g = normalizeGender(latestUtter);
      if (g) {
        return {
          actions: [
            { type: "set_field", key: "genderId", value: g },
            {
              type: "bot_message",
              text: L("askBioShort"),
            },
          ],
        };
      }
      return {
        actions: [
          genderPromptAction(L("askGenderOpen")),
        ],
      };
    }

    // bio
    if (nextField === "bio") {
      const keywords = parseKeywords(latestUtter);
      if (keywords.length) {
        const bioText = await generateBioFromKeywords({
          apiKey,
          displayname: state.draftSummary.displayName ?? "",
          age: state.draftSummary.age ?? "",
          gender: state.draftSummary.genderId ?? "",
          keywords,
          locale: localeCode,
          maxChars: 220,
        });
        return {
          actions: [
            { type: "set_field", key: "bio", value: bioText },
            { type: "finalize" },
          ],
        };
      }

      const b = latestUtter;
      if (b.length >= 1 && b.length <= 280) {
        return {
          actions: [
            { type: "set_field", key: "bio", value: b },
            { type: "finalize" },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: L("askBioAlt"),
          },
        ],
      };
    }
  }

  const next = (
    state.missingFields.length
      ? state.missingFields
      : REQUIRED.filter((k) => !state.draftSummary[k])
  ).find((f) => REQUIRED.includes(f));

  if (utter && next && (!preferAI || !canUseAI)) {
    // displayName
    if (next === "displayName") {
      const nameCheck = await validateDisplayName(supa, utter);
      if (nameCheck.ok) {
        return {
          actions: [
            { type: "set_field", key: "displayName", value: nameCheck.value },
            { type: "bot_message", text: L("askAge") },
          ],
        };
      } else {
        return {
          actions: [
            {
              type: "bot_message",
              text: L(
                nameCheck.reason === "taken"
                  ? "askNameTaken"
                  : "askNameValidation"
              ),
            },
          ],
        };
      }
    }

    // age
    if (next === "age") {
      const n = parseInt(utter, 10);
      if (!Number.isNaN(n) && n >= 18 && n <= 120) {
        return {
          actions: [
            { type: "set_field", key: "age", value: n },
            {
              ...genderPromptAction(L("askGenderShort")),
            },
          ],
        };
      } else {
        return {
          actions: [
            {
              type: "bot_message",
              text: L("askAgeSimple"),
            },
          ],
        };
      }
    }

    // genderId
    if (next === "genderId") {
      const g = normalizeGender(utter);
      if (g) {
        return {
          actions: [
            { type: "set_field", key: "genderId", value: g },
            {
              type: "bot_message",
              text: L("askBioShort"),
            },
          ],
        };
      }
      return {
        actions: [
          genderPromptAction(L("askGenderOpen")),
        ],
      };
    }

    // bio
    if (next === "bio") {
      if (utter.length <= 280) {
        return {
          actions: [
            { type: "set_field", key: "bio", value: utter },
            { type: "finalize" },
          ],
        };
      } else {
        return {
          actions: [
            {
              type: "bot_message",
              text: L("askBioShorter"),
            },
          ],
        };
      }
    }
  }

  // ------------------------------------------------------------------
  // (B) NO-KEY / OFFLINE FALLBACK — keep flow working without OpenAI
  // ------------------------------------------------------------------

  //  console.log(
  //    "[OnboardingAI] ",
  //    config.OPENAI_API_KEY
  //  );

  if (!canUseAI) {
    const next = state.missingFields[0];

    // If we're offline but the latest user message looks like keywords for a bio, generate a localized fallback bio.
    if (next === "bio" && latestUtter) {
      const keywords = parseKeywords(latestUtter);
      if (keywords.length) {
        const bioText = await generateBioFromKeywords({
          apiKey,
          displayname: state.draftSummary.displayName ?? "",
          age: state.draftSummary.age ?? "",
          gender: state.draftSummary.genderId ?? "",
          keywords,
          locale: localeCode,
          maxChars: 220,
        });
        return {
          actions: [
            { type: "set_field", key: "bio", value: bioText },
            { type: "finalize" },
          ],
        };
      }
    }

    const question = questionForField(next);
    const actions = state.isComplete
      ? [{ type: "finalize" }]
      : [
          next === "genderId"
            ? genderPromptAction(question)
            : { type: "bot_message", text: question },
        ];
    return { actions };
  }

  // ------------------------------------------------------------------
  // (C) OpenAI path
  // ------------------------------------------------------------------
  const client = new OpenAI({ apiKey });
  const MODEL = model;

  const system = `You are the Onboarding Orchestrator for a chat app. Language for all bot_message outputs: ${localeCode}.

CRITICAL RULES — FOLLOW ALL OF THEM:
1) Use the provided tools for ALL outputs. Do NOT place JSON or text in assistant message content. 
2) Each step should emit only the necessary tool calls (bot_message, set_field, finalize).
3) Validate user input before set_field:
   - displayName: string with a reasonable length; do not mention exact character limits.
   - age: integer 18–120 (do not mention numeric ranges in the user message).
   - genderId: interpret natural language (e.g., “male/man/he/him”→1, “female/woman/she/her”→2, “other/non-binary/nb/enby”→3) and call set_field with the numeric code [1,2,3]. Do not ask the user to reply with numbers.
   - bio: string 1–280 chars, single paragraph.
4) If the user input is invalid, call bot_message with a short corrective prompt and ask again.
5) Ask only one question at a time; keep messages concise and friendly.
6) When all required fields are present and valid, call finalize() and nothing else.
7) NEVER echo user PII in full. Do not invent fields or call undeclared tools.
8) If you can’t proceed due to missing info, ask a targeted question via bot_message.
9) If userUtterance is non-empty and the next required field is known, validate and call set_field immediately; do not repeat the same question.
10) For the "bio" step:
    a) If user already typed a bio (1–280 chars, single paragraph), call set_field("bio") immediately.
    b) Otherwise, ask for 3–6 short keywords (separated by commas or spaces).
    c) When keywords are provided, call generate_bio(keywords, locale, tone, maxChars), then call set_field("bio", <result>) and finalize if all fields are present.
Persona & tone: helpful, concise, upbeat. 1–2 sentences per question.
`.trim();

  const chat = [
    { role: "system", content: system },
    {
      role: "user",
      content: JSON.stringify({
        state,
        nextRequired,
        userUtterance:
          [...messages]
            .reverse()
            .find((m) => m?.role === "user" && typeof m.content === "string")
            ?.content ?? null,
      }),
    },
  ];

  const tools = [
    {
      type: "function",
      function: {
        name: "bot_message",
        description: "Send a short message to the user.",
        parameters: {
          type: "object",
          properties: { text: { type: "string" } },
          required: ["text"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "set_field",
        description: "Set a single onboarding field after validation.",
        parameters: {
          type: "object",
          properties: {
            key: {
              type: "string",
              enum: ["displayName", "age", "genderId", "bio"],
            },
            value: {},
          },
          required: ["key", "value"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "finalize",
        description: "Finalize onboarding once all fields are valid.",
        parameters: { type: "object", properties: {} },
      },
    },

    {
      type: "function",
      function: {
        name: "generate_bio",
        description:
          "Create a short first-person dating-style bio from keywords.",
        parameters: {
          type: "object",
          properties: {
            keywords: {
              type: "array",
              items: { type: "string" },
              description: "3–6 short keywords",
            },
            locale: { type: "string", default: "en" },
            tone: { type: "string", default: "humorous" },
            maxChars: { type: "number", default: 220 },
          },
          required: ["keywords"],
        },
      },
    },
  ];

  let actions = [];

  try {
    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: chat,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    });

    const msg = resp?.choices?.[0]?.message;
    const calls = msg?.tool_calls || [];

    if (!calls.length) {
      const next = (state.missingFields || []).find((f) =>
        REQUIRED.includes(f)
      );
      const question =
        next === "displayName"
          ? L("consentAskName")
          : next === "age"
          ? L("askAge")
          : next === "genderId"
          ? L("askGenderShort")
          : next === "bio"
          ? L("askBio")
          : L("finalizePrompt");
      if (next === "genderId") {
        return { actions: [genderPromptAction(question)] };
      }
      return { actions: [{ type: "bot_message", text: question }] };
    }

    // ---- Parse tool calls (collect requests) ----
    let genBioArgs = null; // <- if the model asks to call generate_bio, we store args

    for (const c of calls) {
      const name = c.function?.name;
      let args = {};
      try {
        args = c.function?.arguments ? JSON.parse(c.function.arguments) : {};
      } catch {}

      if (name === "bot_message") {
        actions.push({ type: "bot_message", text: String(args.text || "") });
      }

      if (
        name === "set_field" &&
        ["displayName", "age", "genderId", "bio"].includes(args.key)
      ) {
        actions.push({ type: "set_field", key: args.key, value: args.value });
      }

      if (name === "finalize") {
        actions.push({ type: "finalize" });
      }

      if (name === "generate_bio") {
        genBioArgs = args; // defer execution until after the loop
      }
    }

    // ---- Handle generate_bio (execute now) ----
    if (genBioArgs?.keywords?.length) {
      const bioLocale = genBioArgs.locale || localeCode;
      const tone = genBioArgs.tone || "humorous";
      const maxChars = genBioArgs.maxChars || 220;

      // hydrate context from current draft
      const displayname = state.draftSummary.displayName ?? "";
      const age = state.draftSummary.age ?? "";
      const genderId = state.draftSummary.genderId ?? null;
      const gender =
        genderId === 1
          ? "male"
          : genderId === 2
          ? "female"
          : genderId === 3
          ? "other"
          : "";

      const keywords = genBioArgs.keywords.map(String);
      const bioText = await generateBioFromKeywords({
        apiKey,
        displayname,
        age,
        gender,
        keywords,
        locale: bioLocale,
        maxChars,
        tone,
      });

      actions.push({ type: "set_field", key: "bio", value: bioText });
    }

    const displayNameAction = actions.find(
      (a) => a.type === "set_field" && a.key === "displayName"
    );
    if (displayNameAction) {
      const nameCheck = await validateDisplayName(supa, displayNameAction.value);
      if (!nameCheck.ok) {
        actions = actions.filter(
          (a) => !(a.type === "set_field" && a.key === "displayName")
        );
        actions = actions.filter((a) => a.type !== "finalize");
        actions = actions.filter((a) => a.type !== "bot_message");
        actions.push({
          type: "bot_message",
          text: L(nameCheck.reason === "taken" ? "askNameTaken" : "askNameValidation"),
        });
      } else {
        displayNameAction.value = nameCheck.value;
      }
    }

    // (3A) Coerce any AI gender set_field value to numeric 1/2/3
    for (let i = 0; i < actions.length; i++) {
      const a = actions[i];
      if (a.type === "set_field" && a.key === "genderId") {
        if (typeof a.value !== "number") {
          const g = normalizeGender(a.value);
          if (g) {
            actions[i] = { ...a, value: g };
          } else {
            // Invalid gender; remove this set_field and ask in natural language
            actions.splice(i, 1);
            i--;
            actions.push(genderPromptAction(L("askGenderOpen")));
          }
        }
      }
    }

    // === AFTER parsing tool calls into `actions` ===

    // Helper stays where you defined it:
    // function isValidBio(s) { ... }

    const latestUtter2 =
      [...(messages || [])]
        .reverse()
        .find((m) => m?.role === "user" && typeof m.content === "string")
        ?.content?.trim() || "";

    const gFromLatest = normalizeGender(latestUtter2);
    const genderAlreadySet = actions.some(
      (a) => a.type === "set_field" && a.key === "genderId"
    );
    if (!genderAlreadySet && nextRequired === "genderId" && gFromLatest) {
      actions.push({ type: "set_field", key: "genderId", value: gFromLatest });
      actions = actions.filter(
        (a) =>
          !(a.type === "bot_message" && /gender|identify/i.test(a.text || ""))
      );
    }

    const projected = { ...state.draftSummary };
    const setFieldKeysThisRound = new Set();

    for (const a of actions) {
      if (
        a.type === "set_field" &&
        ["displayName", "age", "genderId", "bio"].includes(a.key)
      ) {
        projected[a.key] = a.value;
        setFieldKeysThisRound.add(a.key);
      }
    }
    // What’s still missing *after* AI tool calls?
    let missingAfter = REQUIRED.filter(
      (k) =>
        !projected[k] ||
        (typeof projected[k] === "string" && !projected[k].trim())
    );
    const stillMissing = missingAfter[0];
    const aiDidSetBio = setFieldKeysThisRound.has("bio");
    const aiSetOtherField = [...setFieldKeysThisRound].some((k) => k !== "bio");

    if (
      nextRequired === "bio" &&
      !aiDidSetBio &&
      !aiSetOtherField &&
      stillMissing === "bio" &&
      isValidBio(latestUtter2)
    ) {
      actions.push({ type: "set_field", key: "bio", value: latestUtter2 });

      // Remove any just-added "please share a bio" prompt to avoid mixed signals
      actions = actions.filter(
        (a) =>
          !(
            a.type === "bot_message" &&
            /short bio|share a short bio|one paragraph/i.test(a.text || "")
          )
      );

      // Re-evaluate missing; finalize if complete
      projected.bio = latestUtter2;
      missingAfter = REQUIRED.filter(
        (k) =>
          !projected[k] ||
          (typeof projected[k] === "string" && !projected[k].trim())
      );

      missingAfter = REQUIRED.filter(
        (k) =>
          !projected[k] ||
          (typeof projected[k] === "string" && !projected[k].trim())
      );
      if (missingAfter.length === 0) actions.push({ type: "finalize" });
    }
  } catch (e) {
    // Graceful fallback question on error
    const next = (state.missingFields || []).find((f) => REQUIRED.includes(f));

    // If we have a bio next and keywords, try to generate a localized fallback bio even when OpenAI fails.
    if (next === "bio" && latestUtter) {
      const keywords = parseKeywords(latestUtter);
      if (keywords.length) {
        const bioText = await generateBioFromKeywords({
          apiKey,
          displayname: state.draftSummary.displayName ?? "",
          age: state.draftSummary.age ?? "",
          gender: state.draftSummary.genderId ?? "",
          keywords,
          locale: localeCode,
          maxChars: 220,
        });
        actions = [
          { type: "set_field", key: "bio", value: bioText },
          { type: "finalize" },
        ];
        return { actions };
      }
    }

    const question = questionForField(next);
    actions = [
      next === "genderId"
        ? genderPromptAction(question)
        : { type: "bot_message", text: question },
    ];
  }

  // Last safeguard for resume with no output
  if (!actions.length && state.resume) {
    const next = (state.missingFields || []).find((f) => REQUIRED.includes(f));
    const question = questionForField(next);
    actions.push(
      next === "genderId"
        ? genderPromptAction(question)
        : { type: "bot_message", text: question }
    );
  }

  if (
    nextRequired === "genderId" &&
    !actions.some((a) => a.type === "set_field" && a.key === "genderId")
  ) {
    const hasGenderOptions = (text = "") =>
      /\b(male|female|other|nonbinary|nb|man|woman|homme|femme|autre|муж|жен|другое|男|女|其他)\b/i.test(
        text
      );
    for (let i = actions.length - 1; i >= 0; i -= 1) {
      const a = actions[i];
      if (a.type === "bot_message") {
        const nextText = hasGenderOptions(a.text)
          ? L("askGenderOpen")
          : a.text;
        if (
          nextText !== a.text ||
          !Array.isArray(a.quickReplies) ||
          !a.quickReplies.length
        ) {
          actions[i] = { ...a, text: nextText, quickReplies: genderReplies };
        }
        break;
      }
    }
  }

  return { actions };
});
