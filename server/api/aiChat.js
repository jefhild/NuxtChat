// server/api/aiChat.post.js
import OpenAI from "openai";
import mustache from "mustache";
import { serverSupabaseClient } from "#supabase/server";

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const isDev = process.env.NODE_ENV !== "production";
  const query = getQuery(event);
  const debug = isDev || query.debug === "1";

  try {
    if (!config.OPENAI_API_KEY) {
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
      aiUser, // string (persona key or display name, required)
      userAge, // number | null
      history, // [{ sender, content }]
      replyTo, // string | null
    } = body || {};

    if (!userMessage) return { success: false, error: "Missing userMessage" };
    if (!aiUser) return { success: false, error: "Missing aiUser" };

    const slugify = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const personaKey = slugify(aiUser);

    const supabase = await serverSupabaseClient(event);
    const { data: persona, error: personaErr } = await supabase
      .from("ai_personas")
      .select(
        "id, persona_key, profile_user_id, model, temperature, top_p, presence_penalty, frequency_penalty, max_response_tokens, max_history_messages, system_prompt_template, response_style_template, parameters"
      )
      .eq("persona_key", personaKey)
      .eq("is_active", true)
      .single();

    // console.log("[aiChat] persona:", persona);
    
    if (personaErr) {
      console.error("[aiChat] Persona fetch error:", personaErr);
      // Common cause: RLS denies anon users
      throw createError({
        statusCode: 403,
        statusMessage: "Persona read denied",
      });
    }
    if (!persona ) {
      console.warn("[aiChat] Persona missing/inactive:", personaKey);
      throw createError({
        statusCode: 404,
        statusMessage: `Persona not found: ${aiUser}`,
      });
    }

    const safeHistory = Array.isArray(history)
      ? history.slice(-(persona.max_history_messages ?? 10))
      : [];

    const vars = {
      userName: userName ?? "",
      userGender: userGender ?? "",
      userAge: userAge ?? "",
    };

    // Render the base system prompt template
    const promptBase = mustache.render(
      persona.system_prompt_template || "",
      vars
    );

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

    // if (debug) {
    //   const preview =
    //     fullPrompt.length > 2000
    //       ? fullPrompt.slice(0, 2000) + "…(truncated)"
    //       : fullPrompt;
    //   console.log("[aiChat] Persona:", persona.persona_key);
    //   console.log("[aiChat] Prompt preview:\n", preview);
    //   console.log("[aiChat] User message:", userMessage);
    // }

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });

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

    const aiResponse = response?.choices?.[0]?.message?.content ?? "";
    if (debug)
      // console.log("[aiChat] AI response preview:", aiResponse.slice(0, 300));

      return { success: true, aiResponse };
  } catch (err) {
    console.error("[aiChat] error:", err);
    throw err; // Let Nuxt return proper status code/message
  }
});
