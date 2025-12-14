import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";
import OpenAI from "openai";

export default defineEventHandler(async (event) => {
  // const user = event.context?.auth?.user || null;
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const { threadId } = (await readBody(event)) || {};
  if (!threadId)
    throw createError({ statusCode: 400, statusMessage: "threadId required" });
  const cfg = useRuntimeConfig(event); // safe in server routes
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { error: upErr } = await supa.from("user_thread_joins").upsert({
    user_id: user.id,
    thread_id: threadId,
    last_joined_at: new Date().toISOString(),
  });
  if (upErr)
    throw createError({ statusCode: 500, statusMessage: upErr.message });

  // Enroll human participant for this thread
  const { error: partErr } = await supa.from("thread_participants").upsert(
    {
      thread_id: threadId,
      user_id: user.id,
      kind: "human",
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,user_id" }
  );
  if (partErr && partErr.code !== "23505")
    throw createError({ statusCode: 500, statusMessage: partErr.message });

  // Ensure welcome message exists
  const { data: exists, error: existsErr } = await supa
    .from("messages_v2")
    .select("id")
    .eq("thread_id", threadId)
    .eq("message_type", "welcome")
    .limit(1);
  if (existsErr) console.warn("welcome exist check failed:", existsErr.message);

  if (!exists?.length) {
    // Only now generate (AI + fallback)
    const content = await generateWelcomeText({ supa, threadId }).catch(
      () => null
    );
    const welcomeText = content || "Welcome! What’s your take on the article?";

    const { error: insErr } = await supa.from("messages_v2").insert({
      thread_id: threadId,
      sender_kind: "bot",
      message_type: "welcome",
      content: welcomeText,
      visible: true,
    });
    if (insErr && insErr.code !== "23505") {
      throw createError({ statusCode: 500, statusMessage: insErr.message });
    }

    // Kick off two persona reactions to the welcome question (if available)
    await triggerPersonaReactions({
      supa,
      threadId,
      welcomeText,
    }).catch((err) =>
      console.error("[join.post] persona reactions failed:", err?.message || err)
    );
  }

  return { ok: true };
});

async function triggerPersonaReactions({ supa, threadId, welcomeText }) {
  try {
    const safeWelcome = welcomeText || "Let's start the discussion.";
    // Avoid duplicates: if any persona reactions already exist, skip
    const { data: existing } = await supa
      .from("messages_v2")
      .select("id")
      .eq("thread_id", threadId)
      .eq("message_type", "persona_reaction")
      .limit(1);
    if (existing && existing.length) return;

    // Fetch up to 2 active personas already enrolled on this thread (with profile)
    const { data: personaRows, error: personaErr } = await supa
      .from("thread_participants")
      .select(
        `
          persona:persona_id (
            id,
            persona_key,
            profile_user_id,
            is_active,
            profile:profiles!ai_personas_profile_user_id_fkey (
              id,
              user_id,
              displayname,
              avatar_url,
              slug
            )
          )
        `
      )
      .eq("thread_id", threadId)
      .eq("kind", "persona")
      .not("persona_id", "is", null)
      .limit(2);
    if (personaErr) {
      console.error("[join.post] fetch personas error:", personaErr.message);
      return;
    }
    const personas =
      (personaRows || [])
        .map((p) => p.persona)
        .filter((p) => p && p.is_active)
        .slice(0, 2);

    if (!personas.length) return;

  // Helper to call local aiChat endpoint
  const callAiChat = async ({
    personaKey,
    userMessage,
    history,
    replyTo,
    personaDisplayname,
    extraSystem,
  }) => {
    try {
      const res = await $fetch("/api/aiChat", {
        method: "POST",
        body: {
          userMessage,
          aiUser: personaKey,
          history,
          replyTo: replyTo || null,
          extra_system: extraSystem || null,
        },
      });
      if (!res || res.success === false) {
        throw new Error(res?.error || "aiChat failed");
      }
      // Prefer aiResponse; fall back to other fields
      return (
        res?.aiResponse ||
        res?.data?.aiResponse ||
        res?.data?.message ||
        res?.message ||
        res?.reply ||
        (typeof res === "string" ? res : "")
      );
    } catch (err) {
      console.error("[join.post] aiChat failed, falling back:", err?.message || err);
      // Deterministic fallback so the thread still gets seeded
      return fallbackPersonaReply({ personaKey, userMessage, history, replyTo });
    }
  };

    // First persona reacts to welcome question
    const first = personas[0];
    const historyBase = [{ sender: "host", content: safeWelcome }];
    const firstTextRaw = await callAiChat({
      personaKey: first.persona_key,
      personaDisplayname:
        first.profile?.displayname || first.persona_key || "AI participant",
      userMessage: safeWelcome,
      history: historyBase,
      extraSystem: [
        `You are ${first.profile?.displayname || first.persona_key}, an expert commentator.`,
        "Give a concise 1-2 sentence take.",
        "Do NOT restate or quote the question verbatim.",
        "Avoid repeating the user's wording; add a new angle or opinion.",
      ].join(" "),
    });
    const firstText =
      typeof firstTextRaw === "string" && firstTextRaw.trim()
        ? deParrot(firstTextRaw.trim(), safeWelcome, first.persona_key)
        : fallbackPersonaReply({
            personaKey: first.persona_key,
            userMessage: safeWelcome,
            history: historyBase,
          });

    const firstMessage = {
      thread_id: threadId,
      sender_kind: "bot",
      sender_user_id: null,
      message_type: "persona_reaction",
      content: firstText,
      visible: true,
      meta: {
        persona_id: first.id,
        persona_key: first.persona_key,
        persona_displayname: first.profile?.displayname || first.persona_key,
        persona_avatar_url: first.profile?.avatar_url || null,
        persona_slug: first.profile?.slug || null,
      },
    };

    // Second persona replies to the first persona (if present)
    if (personas.length > 1) {
      const second = personas[1];
      const historySecond = [
        ...historyBase,
        { sender: first.persona_key, content: firstText },
      ];
      const secondTextRaw = await callAiChat({
        personaKey: second.persona_key,
        personaDisplayname:
          second.profile?.displayname || second.persona_key || "AI participant",
        userMessage: `Prior comment from ${
          first.profile?.displayname || first.persona_key
        }: "${firstText}". Main question: ${safeWelcome}`,
        history: historySecond,
        replyTo: firstText,
        extraSystem: [
          `You are ${second.profile?.displayname || second.persona_key}, an expert commentator.`,
          "React with your own concise 1-2 sentence take.",
          "Do NOT restate or quote the question or prior comment verbatim.",
          "Add a new angle or opinion tied back to the main question.",
        ].join(" "),
      });
      const secondText =
        typeof secondTextRaw === "string" && secondTextRaw.trim()
          ? deParrot(
              secondTextRaw.trim(),
              firstText || safeWelcome,
              second.persona_key
            )
          : fallbackPersonaReply({
              personaKey: second.persona_key,
              userMessage: firstText || safeWelcome,
              history: historySecond,
              replyTo: firstText,
            });
      const secondMessage = {
        thread_id: threadId,
        sender_kind: "bot",
        sender_user_id: null,
        message_type: "persona_reaction",
        content: secondText,
        visible: true,
        meta: {
          persona_id: second.id,
          persona_key: second.persona_key,
          persona_displayname: second.profile?.displayname || second.persona_key,
          persona_avatar_url: second.profile?.avatar_url || null,
          persona_slug: second.profile?.slug || null,
        },
      };

      // Insert first, delay, then second
      const { error: firstErr } = await supa
        .from("messages_v2")
        .insert(firstMessage);
      if (firstErr && firstErr.code !== "23505") {
        console.error("[join.post] insert first persona reply error:", firstErr);
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { error: secondErr } = await supa
        .from("messages_v2")
        .insert(secondMessage);
      if (secondErr && secondErr.code !== "23505") {
        console.error("[join.post] insert second persona reply error:", secondErr);
      }
    } else {
      // Only first persona available
      const { error: firstErr } = await supa
        .from("messages_v2")
        .insert(firstMessage);
      if (firstErr && firstErr.code !== "23505") {
        console.error("[join.post] insert first persona reply error:", firstErr);
      }
    }
  } catch (error) {
    console.error("[join.post] persona reactions error:", error?.message || error);
  }
}

const fallbackPersonaReply = ({
  personaKey,
  userMessage,
  history = [],
  replyTo = null,
}) => {
  const base = (replyTo || userMessage || "Noted.").toString();
  return `${personaKey} adds a quick take: ${base}`;
};

const deParrot = (response, question, personaKey) => {
  if (!response) return fallbackPersonaReply({ personaKey, userMessage: question });
  const r = String(response).trim();
  const q = String(question || "").trim();
  if (!q) return r;
  const rLower = r.toLowerCase();
  const qLower = q.toLowerCase();
  const repeatsQuestion =
    rLower === qLower ||
    rLower.includes(qLower) ||
    (r.length <= q.length * 1.2 && rLower.startsWith(qLower.slice(0, 20)));
  if (repeatsQuestion) {
    return `${personaKey} adds a quick take: ${q}`;
  }
  return r;
};

function stripMarkdown(input = "") {
  // Tiny sanitizer: strip MD/HTML and collapse whitespace (safe subset)
  return (
    String(input)
      // inline code / bold / italics / headings / quotes / lists
      .replace(/[`*_>#-]+/g, " ")
      // images ![alt](url)
      .replace(/!\[[^\]]*]\([^)]*\)/g, " ")
      // links [text](url)
      .replace(/\[[^\]]*]\([^)]*\)/g, " ")
      // HTML tags
      .replace(/<\/?[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

async function generateWelcomeText({ supa, threadId, locale = "en" }) {
  // 1) Gather minimal context
  let article = null;
  let threadTitle = null;
  try {
    const { data: t } = await supa
      .from("threads")
      .select("id, title, article_id")
      .eq("id", threadId)
      .maybeSingle();
    threadTitle = t?.title ?? null;
    if (t?.article_id) {
      const { data: a } = await supa
        .from("articles")
        .select("title, content")
        .eq("id", t.article_id)
        .maybeSingle();
      if (a) {
        article = {
          title: a.title ?? threadTitle ?? null,
          // keep a short slice for token efficiency
          excerpt: stripMarkdown(a.content ?? "").slice(0, 1200),
        };
      }
    }
  } catch (err) {
    console.log("[join.post] Context fetch failed:", err?.message || err);
  }

  // 2) Try OpenAI (Responses API) with strict output rules

  const config = useRuntimeConfig();
  // unify on one key name in nuxt.config.ts: runtimeConfig: { openaiApiKey: process.env.OPENAI_API_KEY }
  const apiKey = config.openaiApiKey || config.OPENAI_API_KEY;

  console.log("[join.post] Using OpenAI:", Boolean(apiKey));

  if (apiKey) {
    try {
      const openai = new OpenAI({ apiKey });
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        console.log("[join.post] OpenAI call aborted by timeout");
        controller.abort();
      }, 6000); // modest timeout, still bounded

      const titleForModel = article?.title || threadTitle || "the topic";
      const contextForModel = article?.excerpt || "";
      console.log("[join.post] Generating question for:", {
        titleForModel,
        contextForModelLength: contextForModel.length,
      });
      const system = [
        "You are a concise community host.",
        "Write exactly ONE engaging kickoff question about the article/topic.",
        "Rules:",
        "- 1 sentence, ≤120 characters.",
        "- No emojis, hashtags, quotes, or exclamation spam.",
        "- Be specific to the content; avoid generic phrasing.",
        "- Use the user's locale if provided.",
      ].join("\n");

      const user = [
        `Locale: ${locale}`,
        `Title: ${titleForModel}`,
        contextForModel ? `Context: ${contextForModel}` : "Context: (none)",
        "Return only the question text.",
      ].join("\n");

      const resp = await openai.responses.create(
        {
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          input: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          temperature: 0.7,
          max_output_tokens: 60,
        },
        { signal: controller.signal }
      );
      clearTimeout(timeout);

      const text =
        (typeof resp.output_text === "string" && resp.output_text.trim()) ||
        (Array.isArray(resp.output)
          ? resp.output
              .map((c) => (c?.content?.[0]?.text || "").trim())
              .join(" ")
              .trim()
          : null);
      console.log("[join.post] ✅ AI question generated:", text);
      if (text) return text;
      console.warn("[join.post] OpenAI returned empty text; falling back");
    } catch (err) {
      console.log(
        "[join.post] AI question generation failed:",
        err?.message || err
      );
      if (err?.status) console.error("[join.post] OpenAI status:", err.status);
      if (err?.response?.text) {
        try {
          console.error(
            "[join.post] OpenAI error body:",
            await err.response.text()
          );
        } catch {}
      }
    }
  }

  // 3) Deterministic fallback (no external API)
  const title = article?.title ?? threadTitle ?? null;
  const variants = [
    title ? `What stood out to you in “${title}”?` : "What stood out to you?",
    title ? `Got a take on “${title}”?` : "Got a take? Share it.",
    title ? `Quick thought on “${title}”?` : "Quick thought on the topic?",
    "Welcome! Jump in with your first comment.",
  ];
  return variants[Math.floor(Math.random() * variants.length)];
}
