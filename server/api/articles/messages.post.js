import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";


export default defineEventHandler(async (event) => {
  // Replace with your auth extraction if different
  // const user = event.context?.auth?.user || null;
  const user = await serverSupabaseUser(event);
  if (!user?.id)
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });

  const body = (await readBody(event)) || {};
  const { threadId, content, replyToMessageId = null, clientId = null } = body;
  if (!threadId || !content || typeof content !== "string") {
    throw createError({ statusCode: 400, statusMessage: "Invalid body" });
  }
  if (content.length > 2000) {
    throw createError({ statusCode: 413, statusMessage: "Message too long" });
  }
  const cfg = useRuntimeConfig(event) // safe in server routes
  const { getServerClientFrom } = useDb()
  const supa = getServerClientFrom(cfg.public.SUPABASE_URL, cfg.SUPABASE_SERVICE_ROLE_KEY)

  const { data: tRow, error: tErr } = await supa
    .from("threads")
    .select("id, kind")
    .eq("id", threadId)
    .single();
  if (tErr || !tRow || tRow.kind !== "article") {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  const { error } = await supa.from("messages_v2").insert({
    thread_id: threadId,
    sender_kind: "user",
    sender_user_id: user.id,
    content,
    visible: true,
    reply_to_message_id: replyToMessageId || null,
    meta: clientId ? { clientId } : null,
  });
  if (error)
    throw createError({ statusCode: 500, statusMessage: error.message });

  return { ok: true };
});
