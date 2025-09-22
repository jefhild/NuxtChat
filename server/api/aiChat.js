// server/api/aiChat.post.js
import OpenAI from "openai";
import { personas } from "../utils/personas"; // adjust path if needed

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const isDev = process.env.NODE_ENV !== "production";
  const query = getQuery(event);
  const debug = isDev || query.debug === "1";

  try {
    if (!config.OPENAI_API_KEY) {
      if (debug) console.error("[aiChat] Missing OPENAI_API_KEY");
      return { success: false, error: "Missing OPENAI_API_KEY" };
    }

    const body = await readBody(event);
    const {
      userMessage, // string (required)
      userGender, // string | null
      userName, // string | null
      aiUser, // string (persona key, required)
      userAge, // number | null
      history, // [{ sender, content }]  👈 renamed from messages
      replyTo, // string | null
    } = body || {};

    if (!userMessage) return { success: false, error: "Missing userMessage" };
    if (!aiUser) return { success: false, error: "Missing aiUser" };

    const persona = personas[aiUser];
    if (!persona) {
      if (debug) {
        console.error("[aiChat] Persona not found:", aiUser);
        console.error("[aiChat] Available:", Object.keys(personas));
      }
      return { success: false, error: `Persona not found: ${aiUser}` };
    }

    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];
    const promptBase = persona.prompt({
      userName: userName ?? null,
      userGender: userGender ?? null,
      userAge: userAge ?? null,
    });

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

    if (debug) {
      const preview =
        fullPrompt.length > 2000
          ? fullPrompt.slice(0, 2000) + "…(truncated)"
          : fullPrompt;
      console.log("[aiChat] Persona:", aiUser);
      console.log("[aiChat] Prompt preview:\n", preview);
      console.log("[aiChat] User message:", userMessage);
    }

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: fullPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
    });

    const aiResponse = response?.choices?.[0]?.message?.content ?? "";
    if (debug)
      console.log("[aiChat] AI response preview:", aiResponse.slice(0, 300));

    return { success: true, aiResponse };
  } catch (err) {
    console.error("[aiChat] error:", err);
    return { success: false, error: String(err?.message || err) };
  }
});
