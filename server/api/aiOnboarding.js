// server/api/aiOnboarding.js
import { defineEventHandler, readBody } from "h3";
import OpenAI from "openai";

const config = useRuntimeConfig();
const apiKey = config.OPENAI_API_KEY || process.env.OPENAI_API_KEY; // belt & suspenders
const model = config.OPENAI_MODEL || process.env.OPENAI_MODEL || "gpt-4.1-mini";
const preferAI = !!(config.OPENAI_API_KEY || process.env.OPENAI_API_KEY);
const canUseAI = !!apiKey; // true if a private key is available on the server

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
  // No key? Return a graceful fallback.
  if (!canUseAI) {
    return locale.startsWith("fr")
      ? "Accro aux cafés, amateur de jeux de mots et randonneur du dimanche. Si tu ris facilement, on s’entendra bien."
      : "Coffee-fueled pun appreciator and weekend hiker. If you laugh easily, we’ll get along great.";
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
      bio = locale.startsWith("fr")
        ? "Fan de café et de jeux de mots, toujours partant pour de petites aventures."
        : "Coffee fan and pun enthusiast, always up for small adventures.";
    } else if (bio.toLowerCase() === "inappropriate") {
      bio = locale.startsWith("fr")
        ? "Je préfère garder mon profil sympathique—on peut essayer avec d’autres mots-clés ?"
        : "Let’s keep it friendly—try a different set of keywords?";
    }
    if (bio.length > maxChars) bio = bio.slice(0, maxChars).trim();
    return bio;
  } catch (error) {
    console.error("[aiOnboarding.generateBio] error:", error);
    return locale.startsWith("fr")
      ? "Optimiste à l’espresso, cherche copilote pour petites aventures."
      : "Espresso-fueled optimist seeking a co-pilot for small adventures.";
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
  } = await readBody(event);

  console.log("[OnboardingAI] incoming body:", {
    messages: messages?.map((m) => m.role + ":" + m.content).slice(-3), // last 3 for context
    draftSummary,
    missingFields,
    consented,
    isComplete,
    resume,
  });

  // ------------------------------------------------------------------
  // (A) HARD CONSENT FALLBACK — runs BEFORE calling OpenAI
  // ------------------------------------------------------------------
  if (!consented) {
    const said = messages?.[0]?.content?.trim() || "";
    // If no user utterance yet, always ask for consent explicitly

    console.log("[OnboardingAI] consent branch, said:", said);

    if (!said) {
      return {
        actions: [
          {
            type: "bot_message",
            text: "Do you confirm you are 18+ and accept the terms to continue?",
          },
        ],
      };
    }
    // Simple yes/no parsing
    if (/^(y|yes|i agree|ok|okay|sure)$/i.test(said)) {
      return {
        actions: [
          { type: "set_consent", value: true },
          { type: "bot_message", text: "Thanks! Let’s set up your profile." },
          { type: "bot_message", text: "What display name should we show?" },
        ],
      };
    }
    return {
      actions: [
        {
          type: "bot_message",
          text: "No problem. Say “yes” when you’re ready to continue, and we’ll proceed.",
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

  console.log("[OnboardingAI] deterministic check", { latestUtter, nextField });

  // ---- Deterministic pre-parse (ONLY if AI is off/unavailable) ----
  if ((!preferAI || !canUseAI) && latestUtter && nextField) {
    console.log(
      "[OnboardingAI] fast-path gated (AI off). Handling:",
      nextField,
      latestUtter
    );

    // displayName
    if (nextField === "displayName") {
      const v = latestUtter;
      if (v.length >= 1 && v.length <= 40) {
        return {
          actions: [
            { type: "set_field", key: "displayName", value: v },
            { type: "bot_message", text: "Great! What's your age? (18+ only)" },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: "Please provide a display name between 1 and 40 characters.",
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
              type: "bot_message",
              text: "Pick a gender: 1=male, 2=female, 3=other",
            },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: "Age must be a number, 18–120. What's your age?",
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
              text: "Almost done! Please share a short bio (1–280 chars, one paragraph).",
            },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: "How do you identify? You can say “male”, “female”, or “other”.",
          },
        ],
      };
    }

    // bio
    if (nextField === "bio") {
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
            text: "Please keep your bio between 1 and 280 characters, one paragraph.",
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
      if (utter.length >= 1 && utter.length <= 40) {
        return {
          actions: [
            { type: "set_field", key: "displayName", value: utter },
            { type: "bot_message", text: "Great! What's your age? (18+ only)" },
          ],
        };
      } else {
        return {
          actions: [
            {
              type: "bot_message",
              text: "Please provide a display name between 1 and 40 characters.",
            },
          ],
        };
      }
    }

    // age
    if (next === "age") {
      const n = parseInt(utter, 10);
      if (!Number.isNaN(n) && n >= 18) {
        return {
          actions: [
            { type: "set_field", key: "age", value: n },
            {
              type: "bot_message",
              text: "Great! Now pick a gender: 1=male, 2=female, 3=other.",
            },
          ],
        };
      } else {
        return {
          actions: [
            {
              type: "bot_message",
              text: "Age must be a number, 18 or older. What's your age?",
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
              text: "Nice! Write a short bio (≤ 300 chars, 1–2 sentences).",
            },
          ],
        };
      }
      return {
        actions: [
          {
            type: "bot_message",
            text: "How do you identify? You can say “male”, “female”, or “other”.",
          },
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
              text: "Please keep your bio under 300 characters.",
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
    console.log(
      "[OnboardingAI] offline fallback branch, next:",
      state.missingFields[0]
    );
    const next = state.missingFields[0];
    const question =
      next === "displayName"
        ? "What display name should we show?"
        : next === "age"
        ? "How old are you? (18+ only)"
        : next === "genderId"
        ? "How do you identify? You can say “male”, “female”, or “other”."
        : next === "bio"
        ? "Write a short bio (1–2 sentences)."
        : "Shall I finalize your profile now?";
    const actions = state.isComplete
      ? [{ type: "finalize" }]
      : [{ type: "bot_message", text: question }];
    return { actions };
  }

  // ------------------------------------------------------------------
  // (C) OpenAI path
  // ------------------------------------------------------------------
  const client = new OpenAI({ apiKey });
  const MODEL = model;

  const system = `You are the Onboarding Orchestrator for a chat app.

CRITICAL RULES — FOLLOW ALL OF THEM:
1) Use the provided tools for ALL outputs. Do NOT place JSON or text in assistant message content. 
2) Each step should emit only the necessary tool calls (bot_message, set_field, finalize).
3) Validate user input before set_field:
   - displayName: string 1–40 chars, trim whitespace.
   - age: integer 18–120.
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
    console.log("[OnboardingAI] calling OpenAI", { MODEL, state });

    const resp = await client.chat.completions.create({
      model: MODEL,
      messages: chat,
      tools,
      tool_choice: "auto",
      temperature: 0.2,
    });

    console.log(
      "[OnboardingAI] OpenAI raw response:",
      JSON.stringify(resp, null, 2)
    );
    const msg = resp?.choices?.[0]?.message;
    const calls = msg?.tool_calls || [];

    if (!calls.length) {
      console.warn("[OnboardingAI] No tool calls. content:", msg?.content);
      console.log(
        "[OnboardingAI] tool_calls:",
        (msg?.tool_calls || []).map((c) => c.function?.name)
      );
      console.log("[OnboardingAI] content (if any):", msg?.content);
      const next = (state.missingFields || []).find((f) =>
        REQUIRED.includes(f)
      );
      const question =
        next === "displayName"
          ? "What display name should we show?"
          : next === "age"
          ? "How old are you? (18+ only)"
          : next === "genderId"
          ? "Pick a gender: 1=male, 2=female, 3=other"
          : next === "bio"
          ? "Write a short bio (1–2 sentences)."
          : "Shall I finalize your profile now?";
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
      const locale = genBioArgs.locale || "en";
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
      console.log("[OnboardingAI] generate_bio called with:", {
        keywords,
        locale,
        tone,
        maxChars,
      });

      const bioText = await generateBioFromKeywords({
        apiKey,
        displayname,
        age,
        gender,
        keywords,
        locale,
        maxChars,
        tone,
      });

      actions.push({ type: "set_field", key: "bio", value: bioText });
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
            actions.push({
              type: "bot_message",
              text: "Got it—how do you identify? You can say “male”, “female”, or “other”.",
            });
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
      console.log("[OnboardingAI] accepting valid bio via guardrail");
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
    const question =
      next === "displayName"
        ? "What display name should we show?"
        : next === "age"
        ? "How old are you? (18+ only)"
        : next === "genderId"
        ? "Pick a gender: 1=male, 2=female, 3=other"
        : next === "bio"
        ? "Write a short bio (1–2 sentences)."
        : "Let’s confirm your details. Ready to finalize?";
    actions = [{ type: "bot_message", text: question }];
  }

  // Last safeguard for resume with no output
  if (!actions.length && state.resume) {
    const next = (state.missingFields || []).find((f) => REQUIRED.includes(f));
    const question =
      next === "displayName"
        ? "What display name should we show?"
        : next === "age"
        ? "How old are you? (18+ only)"
        : next === "genderId"
        ? "How do you identify? You can say “male”, “female”, or “other”."
        : next === "bio"
        ? "Write a short bio (1–2 sentences)."
        : "Shall I finalize your profile now?";
    actions.push({ type: "bot_message", text: question });
  }

  return { actions };
});
