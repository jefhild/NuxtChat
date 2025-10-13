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

  // Simple greet cadence: greet if no bot greet in last 12h
  const twelveHoursAgo = new Date(
    Date.now() - 12 * 60 * 60 * 1000
  ).toISOString();
  const { data: recentBot, error: botErr } = await supa
    .from("messages_v2")
    .select("id")
    .eq("thread_id", threadId)
    .eq("sender_kind", "bot")
    .gte("created_at", twelveHoursAgo)
    .limit(1);

  if (!botErr && (!recentBot || recentBot.length === 0)) {
    await supa.from("messages_v2").insert({
      thread_id: threadId,
      sender_kind: "bot",
      content: "Welcome! What’s your take on the article?",
      visible: true,
    });
  }

  return { ok: true };
});
