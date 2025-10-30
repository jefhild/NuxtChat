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
  }

  return { ok: true };
});

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
