import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";
import { normalizeDiscussionLocale } from "@/server/utils/discussionTranslations";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const body = (await readBody(event)) || {};
    const threadId = String(body.thread_id || "");
    const senderUserId = String(body.sender_user_id || "");
    const content = String(body.content || "").trim();
    const replyToMessageId = body.reply_to_message_id
      ? String(body.reply_to_message_id)
      : null;
    const sourceLocaleRaw = String(
      body.source_locale || body.locale || ""
    ).trim();
    const sourceLocale = sourceLocaleRaw
      ? normalizeDiscussionLocale(sourceLocaleRaw)
      : null;

    if (!threadId || !senderUserId || !content) {
      setResponseStatus(event, 400);
      return {
        error: {
          stage: "body",
          message: "thread_id, sender_user_id, and content required",
        },
      };
    }

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: me, error: meErr } = await supa
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (meErr) {
      console.error("[admin/discussion-messages.post] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const { data: thread, error: threadErr } = await supa
      .from("threads")
      .select("id, kind, published")
      .eq("id", threadId)
      .maybeSingle();
    if (threadErr) {
      setResponseStatus(event, 500);
      return { error: { stage: "thread", message: threadErr.message } };
    }
    if (!thread || thread.kind !== "article" || thread.published !== true) {
      setResponseStatus(event, 404);
      return { error: { stage: "thread", message: "Thread not found" } };
    }

    if (replyToMessageId) {
      const { data: parent, error: parentErr } = await supa
        .from("messages_v2")
        .select("id, thread_id")
        .eq("id", replyToMessageId)
        .maybeSingle();
      if (parentErr) {
        setResponseStatus(event, 500);
        return { error: { stage: "reply_to", message: parentErr.message } };
      }
      if (!parent || parent.thread_id !== threadId) {
        setResponseStatus(event, 400);
        return {
          error: {
            stage: "reply_to",
            message: "reply_to_message_id must belong to the same thread",
          },
        };
      }
    }

    const meta = sourceLocale ? { source_locale: sourceLocale } : null;
    const { data, error } = await supa
      .from("messages_v2")
      .insert({
        thread_id: threadId,
        sender_kind: "user",
        sender_user_id: senderUserId,
        content,
        visible: true,
        reply_to_message_id: replyToMessageId,
        meta,
      })
      .select(
        "id, thread_id, sender_user_id, content, created_at, reply_to_message_id, meta"
      )
      .maybeSingle();

    if (error) {
      console.error("[admin/discussion-messages.post] insert error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "insert", message: error.message } };
    }

    await supa.from("thread_participants").upsert(
      {
        thread_id: threadId,
        user_id: senderUserId,
        kind: "user",
      },
      { onConflict: "thread_id,user_id", ignoreDuplicates: true }
    );

    return { item: data };
  } catch (err) {
    console.error("[admin/discussion-messages.post] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
