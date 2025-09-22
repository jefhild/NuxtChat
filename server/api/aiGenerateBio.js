// server/api/aiGenerateBio.post.js
import OpenAI from "openai";

export default defineEventHandler(async (event) => {
  const { OPENAI_API_KEY } = useRuntimeConfig();
  const body = await readBody(event);

  // Accept both string and array for keywords
  const {
    displayname = "",
    age = "",
    gender = "",
    keywords = [],
    locale = "en",
    maxChars = 220,
    tone = "humorous",
  } = body || {};

  const kwList = Array.isArray(keywords)
    ? keywords.filter(Boolean)
    : String(keywords || "")
        .split(/[,\n]/)
        .map((s) => s.trim())
        .filter(Boolean);

  // If no key, return a safe fallback instead of erroring the UI
  if (!OPENAI_API_KEY) {
    const fallback = locale.startsWith("fr")
      ? "Accro aux cafés, amateur de jeux de mots et randonneur du dimanche. Si tu ris facilement, on s’entendra bien."
      : "Coffee-fueled pun appreciator and weekend hiker. If you laugh easily, we’ll get along great.";
    return { ok: true, bio: fallback };
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const prompt = `
Write a short ${tone} dating-style bio (max ${maxChars} characters).
Language: ${locale}. Keep it playful, specific, no clichés, no hashtags.
Speak in first person.
Use these details if helpful:
- Name: ${displayname}
- Age: ${age}
- Gender: ${gender}
- Keywords: ${kwList.join(", ")}

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
        ? "Je préfère garder mon profil sympathique—on peut essayer avec d’autres mots‑clés ?"
        : "Let’s keep it friendly—try a different set of keywords?";
    }

    // Hard trim to maxChars just in case
    if (bio.length > maxChars) bio = bio.slice(0, maxChars).trim();

    return { ok: true, bio };
  } catch (error) {
    console.error("[aiGenerateBio] error:", error);
    const fallback = locale.startsWith("fr")
      ? "Optimiste à l’espresso, cherche copilote pour petites aventures."
      : "Espresso-fueled optimist seeking a co‑pilot for small adventures.";
    return { ok: true, bio: fallback };
  }
});
