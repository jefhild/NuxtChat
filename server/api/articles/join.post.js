import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";

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

  // Ensure exactly ONE welcome per thread (DB unique index enforces it)
  const content = await generateWelcomeText({ supa, threadId }).catch(
    () => null
  );
  const welcomeText = content || "Welcome! What’s your take on the article?";

  const { data: exists, error: existsErr } = await supa
    .from("messages_v2")
    .select("id")
    .eq("thread_id", threadId)
    .eq("message_type", "welcome")
    .limit(1);
  if (existsErr) console.warn("welcome exist check failed:", existsErr.message);
  if (!exists?.length) {
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

async function generateWelcomeText({ supa, threadId }) {
  // Try to personalize from article title (if threads has article_id)
  let title = null;
  try {
    const { data: t } = await supa
      .from("threads")
      .select("article_id, title") // adjust columns you have
      .eq("id", threadId)
      .maybeSingle();
    title = t?.title || null;
  } catch {}

  // Simple creative variants (deterministic, no API needed)
  const variants = [
    title ? `What stood out to you in “${title}”?` : "What stood out to you?",
    title ? `Got a take on “${title}”?` : "Got a take? Share it!",
    title ? `Hot take time: “${title}”.` : "Hot take time.",
    title ? `Quick thought on “${title}”?` : "Quick thought on the topic?",
    "Welcome! Jump in with your first comment.",
  ];
  const idx = Math.floor(Math.random() * variants.length);
  return variants[idx];
}
