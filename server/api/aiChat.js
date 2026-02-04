// server/api/aiChat.post.js
import { getOpenAIClient } from "@/server/utils/openaiGateway";
import mustache from "mustache";
import { serverSupabaseClient, serverSupabaseUser } from "#supabase/server";

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
      aiUser, // string (persona key or display name, required)
      userAge, // number | null
      history, // [{ sender, content }]
      replyTo, // string | null
      extra_system, // string | null
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
        "id, persona_key, profile_user_id, model, temperature, top_p, presence_penalty, frequency_penalty, max_response_tokens, max_history_messages, system_prompt_template, response_style_template, parameters"
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

    const safeHistory = Array.isArray(history)
      ? history.slice(-(persona.max_history_messages ?? 10))
      : [];

    const vars = {
      userName: userName ?? "",
      userGender: userGender ?? "",
      userAge: userAge ?? "",
    };

    // Render the base system prompt template
    let promptBase = mustache.render(persona.system_prompt_template || "", vars);
    if (extra_system && typeof extra_system === "string") {
      promptBase = `${promptBase}\n${extra_system.trim()}`;
    }
    if (persona.response_style_template) {
      const style = mustache.render(
        String(persona.response_style_template),
        vars
      ).trim();
      if (style) {
        promptBase = `${promptBase}\nResponse style: ${style}`;
      }
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

    const aiResponse = response?.choices?.[0]?.message?.content ?? "";
    if (debug) {
      // console.log("[aiChat] AI response preview:", aiResponse.slice(0, 300));
    }

    return { success: true, aiResponse };
  } catch (err) {
    console.error("[aiChat] error:", err);
    throw err; // Let Nuxt return proper status code/message
  }
});
