import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";
import { translateText } from "@/server/utils/translate";

const NON_LATIN_RE = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uac00-\ud7af\u0400-\u04ff\u0500-\u052f]/;
const FRENCH_RE = /[àâçéèêëîïôûùüÿœ]/i;
const needsTranslation = (text = "", targetLocale = "en") => {
  if (targetLocale !== "en") return true;
  return NON_LATIN_RE.test(text) || FRENCH_RE.test(text);
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const query = getQuery(event);
    const userId = String(query.user_id || "");
    const peerId = String(query.peer_id || "");
    const unreadOnly = query.unread_only === "true";
    const limit = Math.min(Number(query.limit || 40), 200);
    const adminLocale = String(query.locale || "en");

    if (!userId) {
      setResponseStatus(event, 400);
      return { error: { stage: "query", message: "user_id required" } };
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
      console.error("[admin/messages.get] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const select =
      "id, sender_id, receiver_id, content, created_at, read, sender:profiles!messages_sender_id_fkey(displayname, avatar_url), receiver:profiles!messages_receiver_id_fkey(displayname, avatar_url)";

    let q = supa.from("messages").select(select).order("created_at", {
      ascending: false,
    });

    if (peerId) {
      q = q.or(
        `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`
      );
    } else {
      q = q.eq("receiver_id", userId);
    }

    if (unreadOnly) {
      q = q.eq("read", false);
    }

    q = q.limit(limit);

    const { data, error } = await q;
    if (error) {
      console.error("[admin/messages.get] query error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "query", message: error.message } };
    }

    const items = Array.isArray(data) ? data : [];

    const withTranslations = async (list) => {
      if (!list?.length) return list;
      return Promise.all(
        list.map(async (item) => {
          const content = String(item.content || "");
          const displayname = String(item.sender?.displayname || "");
          const needsContentTx = needsTranslation(content, adminLocale);
          const needsNameTx = needsTranslation(displayname, adminLocale);
          if (!needsContentTx && !needsNameTx) return item;
          try {
            const [contentResult, nameResult] = await Promise.all([
              needsContentTx
                ? translateText({ text: content, targetLocale: adminLocale, config: cfg })
                : null,
              needsNameTx
                ? translateText({ text: displayname, targetLocale: adminLocale, config: cfg })
                : null,
            ]);
            return {
              ...item,
              translated_content:
                contentResult?.ok && contentResult.translatedText !== content
                  ? contentResult.translatedText
                  : null,
              sender: {
                ...item.sender,
                translated_displayname:
                  nameResult?.ok && nameResult.translatedText !== displayname
                    ? nameResult.translatedText
                    : null,
              },
            };
          } catch {
            return item;
          }
        })
      );
    };

    if (!peerId && items.length) {
      const senderIds = Array.from(
        new Set(items.map((item) => item.sender_id).filter(Boolean))
      );

      if (senderIds.length) {
        const { data: replies, error: repliesError } = await supa
          .from("messages")
          .select("receiver_id, created_at")
          .eq("sender_id", userId)
          .in("receiver_id", senderIds);

        if (repliesError) {
          console.error("[admin/messages.get] replies error:", repliesError);
        } else {
          const latestReplyByReceiver = new Map();
          (replies || []).forEach((row) => {
            const existing = latestReplyByReceiver.get(row.receiver_id);
            if (!existing || row.created_at > existing) {
              latestReplyByReceiver.set(row.receiver_id, row.created_at);
            }
          });

          const enriched = items.map((item) => {
            const replyAt = latestReplyByReceiver.get(item.sender_id) || null;
            return {
              ...item,
              reply_at: replyAt,
              has_reply: replyAt ? replyAt >= item.created_at : false,
            };
          });
          return { items: await withTranslations(enriched) };
        }
      }
    }

    return { items: await withTranslations(items) };
  } catch (err) {
    console.error("[admin/messages.get] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
