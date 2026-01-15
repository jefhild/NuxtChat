// server/api/aiOnboardingTurn.post.js
import OpenAI from "openai";
import { useDb } from "@/composables/useDB";

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

const nameTooShortMessage = (locale) =>
  locale.startsWith("fr")
    ? "Veuillez choisir un nom d’affichage plus long."
    : locale.startsWith("ru")
    ? "Пожалуйста, выберите более длинное отображаемое имя."
    : locale.startsWith("zh")
    ? "请使用更长的显示名称。"
    : "Please choose a longer display name.";
const nameTakenMessage = (locale) =>
  locale.startsWith("fr")
    ? "Ce nom d’affichage est déjà utilisé. Essayez-en un autre."
    : locale.startsWith("ru")
    ? "Это отображаемое имя уже занято. Попробуйте другое."
    : locale.startsWith("zh")
    ? "这个显示名称已被占用，请换一个。"
    : "That display name is already taken. Try another.";

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

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { getServerClientFrom } = useDb();
  let supa = null;
  try {
    supa = getServerClientFrom(
      config.public.SUPABASE_URL,
      config.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch {}
  const body = await readBody(event);

  const draft = body?.draft ?? {};
  const lastMsg = String(body?.lastUserMessage ?? "").trim();
  const locale = String(body?.locale ?? "en");
  const history = Array.isArray(body?.history) ? body.history : [];
  const required =
    Array.isArray(body?.required) && body.required.length
      ? body.required
      : ["displayname", "age", "gender_id"];

  const missing = required.filter((k) => !draft?.[k]);
  // Stage lets the model know whether it can show chips or not.
  // consent: handled client-side (you show Yes/No). We set stage based on draft.
  const stage = missing.length ? "collect" : "final";

  // Always return something (no 400/500 to client)
  if (!lastMsg) {
    return {
      ok: true,
      utterance: locale.startsWith("fr")
        ? "Peux-tu m’en dire un peu plus pour compléter ton profil ?"
        : "Could you share a bit more so we can complete your profile?",
      quickReplies: [],
      extracted: {},
    };
  }

  // If no API key, graceful fallback (still respects chip policy)
  if (!config.OPENAI_API_KEY) {
    return {
      ok: true,
      utterance:
        stage === "final"
          ? locale.startsWith("fr")
            ? "Parfait. Dis-moi si tout est correct, puis termine ton profil."
            : "Great. If everything looks good, you can finish your profile."
          : locale.startsWith("fr")
          ? "Merci ! Pouvons-nous compléter les infos manquantes ?"
          : "Thanks! Let’s fill in the remaining details.",
      quickReplies: stage === "final" ? ["Finish profile"] : [],
      extracted: {},
    };
  }

  try {
    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

    const sys = `
You are ImChatty's onboarding assistant. Help complete the user's minimum profile data.

CONTEXT:
- Required fields: ${required.join(", ")}.
- Current draft (JSON): ${JSON.stringify(draft)}.
- Language: ${locale}.
- Stage: ${stage} ("collect" means some required fields are still missing; "final" means all required fields are present).

STRICT RULES:
1) Be short, warm, and ask ONE focused question per turn during "collect".
2) Do NOT propose button options (quickReplies) during "collect". They must be empty [].
3) During "final", you MAY provide exactly one quick reply: ["Finish profile"] and nothing else.
4) Never infer gender. Only set gender_id if the user's last message clearly states gender.
   Map: male→1, female→2, other/nonbinary→3.
5) For age, ask for a single integer 18–120. Do not mention numeric ranges in the user-facing message. If extracting age, ensure it is an integer 18–120.
6) If the user's last message seems to include multiple fields, extract them, but only if you're confident.

OUTPUT FORMAT:
- Use the function tool "submit_onboarding_turn".
- "utterance": next assistant message (localized to ${locale}).
- "quickReplies": 
     - [] for "collect"
     - ["Finish profile"] for "final"
- "extracted": any fields confidently parsed from the user's LAST message only.
`;

    const messages = [
      { role: "system", content: sys },
      ...history.map((m) => ({
        role: m.role === "bot" ? "assistant" : "user",
        content: String(m.text ?? ""),
      })),
      { role: "user", content: lastMsg },
    ];

    const tools = [
      {
        type: "function",
        function: {
          name: "submit_onboarding_turn",
          description:
            "Return the next bot utterance, optional quick replies (per stage rules), and any extracted fields.",
          parameters: {
            type: "object",
            properties: {
              utterance: { type: "string" },
              quickReplies: {
                type: "array",
                items: { type: "string" },
                description:
                  'Must be [] in "collect"; exactly ["Finish profile"] in "final".',
              },
              extracted: {
                type: "object",
                properties: {
                  displayname: { type: "string" },
                  age: { type: "number", description: "integer 18–120" },
                  gender_id: {
                    type: "number",
                    description: "1 male, 2 female, 3 other (only if explicit)",
                  },
                },
                additionalProperties: false,
              },
            },
            required: ["utterance"],
          },
        },
      },
    ];

    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools,
      tool_choice: {
        type: "function",
        function: { name: "submit_onboarding_turn" },
      },
    });

    const call = resp.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) {
      return {
        ok: true,
        utterance:
          stage === "final"
            ? locale.startsWith("fr")
              ? "Parfait. Si tout est OK, termine ton profil."
              : "Great. If everything looks good, you can finish your profile."
            : locale.startsWith("fr")
            ? "Peux-tu préciser pour que je complète ton profil ?"
            : "Could you clarify so I can complete your profile?",
        quickReplies: stage === "final" ? ["Finish profile"] : [],
        extracted: {},
      };
    }

    let args = {};
    try {
      args = JSON.parse(call.function.arguments || "{}");
    } catch {
      args = {};
    }

    // Enforce quickReplies policy server-side too, just in case
    let qr = Array.isArray(args.quickReplies) ? args.quickReplies : [];
    if (stage === "collect") qr = [];
    else if (stage === "final") qr = ["Finish profile"];

    let extracted = args.extracted || {};
    if (extracted.displayname) {
      const nameCheck = await validateDisplayName(supa, extracted.displayname);
      if (!nameCheck.ok) {
        const cleaned = { ...extracted };
        delete cleaned.displayname;
        return {
          ok: true,
          utterance:
            nameCheck.reason === "taken"
              ? nameTakenMessage(locale)
              : nameTooShortMessage(locale),
          quickReplies: qr,
          extracted: cleaned,
        };
      }
      extracted = { ...extracted, displayname: nameCheck.value };
    }

    return {
      ok: true,
      utterance:
        args.utterance ||
        (stage === "final"
          ? "Great. If everything looks good, you can finish your profile."
          : "Thanks! Let’s fill in the remaining details."),
      quickReplies: qr,
      extracted,
    };
  } catch (err) {
    return {
      ok: true,
      utterance:
        stage === "final"
          ? "Great. If everything looks good, you can finish your profile."
          : "Could you share a bit more so we can complete your profile?",
      quickReplies: stage === "final" ? ["Finish profile"] : [],
      extracted: {},
    };
  }
});
