import { useDb } from "@/composables/useDB";
import { serverSupabaseUser } from "#supabase/server";
import { fetchPersonaById } from "~/server/utils/aiBots";
import { fetchDefaultEngagementRule } from "~/server/utils/engagementRules";


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

  // Engagement rule: if replying to a bot/persona message, trigger a follow-up from that persona
  if (replyToMessageId) {
    triggerPersonaFollowUp({
      supa,
      threadId,
      replyToMessageId,
      userContent: content,
      rule: await fetchDefaultEngagementRule(supa, "discussion").catch(() => null),
    }).catch((err) =>
      console.error("[messages.post] persona follow-up error:", err?.message || err)
    );
  }

  return { ok: true };
});

const deParrot = (response, userContent, personaKey) => {
  if (!response) return `${personaKey} adds a quick take.`;
  const r = String(response).trim();
  const u = String(userContent || "").trim();
  if (!u) return r;
  const rLower = r.toLowerCase();
  const uLower = u.toLowerCase();
  const repeatsUser =
    rLower === uLower ||
    rLower.includes(uLower) ||
    (r.length <= u.length * 1.2 && rLower.startsWith(uLower.slice(0, 20)));
  if (repeatsUser) return `${personaKey} adds a quick take: ${u}`;
  return r;
};

async function triggerPersonaFollowUp({
  supa,
  threadId,
  replyToMessageId,
  userContent,
  rule,
}) {
  // Apply engagement rule gating
  const minDelayMs = rule?.rules?.min_delay_ms ?? 0;
  const maxReplies = rule?.rules?.max_replies_per_persona ?? 3;

  // Avoid duplicate follow-ups for the same human message
  const { data: existing } = await supa
    .from("messages_v2")
    .select("id")
    .eq("reply_to_message_id", replyToMessageId)
    .eq("message_type", "persona_followup")
    .limit(1);
  if (existing && existing.length) return;

  // Fetch the message being replied to
  const { data: parent, error: parentErr } = await supa
    .from("messages_v2")
    .select("id, sender_kind, content, meta")
    .eq("id", replyToMessageId)
    .maybeSingle();
  if (parentErr || !parent) return;
  if (parent.sender_kind === "user") return;

  const meta = parent.meta || {};
  const personaKey = meta.persona_key || meta.persona_displayname || null;
  if (!personaKey) return;

  // Fetch persona to get its model/prompt
  const { data: personaRow, error: personaLookupErr } = await supa
    .from("ai_personas")
    .select(
      `
        id,
        persona_key,
        system_prompt_template,
        model,
        temperature,
        top_p,
        presence_penalty,
        frequency_penalty,
        max_response_tokens,
        max_history_messages,
        profile:profiles!ai_personas_profile_user_id_fkey (
          user_id,
          displayname,
          avatar_url,
          slug
        )
      `
    )
    .eq("persona_key", personaKey)
    .eq("is_active", true)
    .maybeSingle();
  if (personaLookupErr || !personaRow) return;

  const personaDisplay = personaRow.profile?.displayname || personaRow.persona_key;

  // Check stats to enforce caps/delays
  const { data: stats } = await supa
    .from("thread_persona_stats")
    .select("reply_count, last_reply_at")
    .eq("thread_id", threadId)
    .eq("persona_id", personaRow.id)
    .maybeSingle();
  const nowTs = Date.now();
  const last = stats?.last_reply_at ? new Date(stats.last_reply_at).getTime() : 0;
  const tooSoon = minDelayMs > 0 && last > 0 && nowTs - last < minDelayMs;
  const overCap = (stats?.reply_count ?? 0) >= maxReplies;
  if (tooSoon || overCap) return;

  const extraSystem = [
    `You are ${personaDisplay}, an expert commentator.`,
    "Reply concisely (1-2 sentences).",
    "Do NOT repeat the user's wording verbatim; add a new angle or opinion.",
  ].join(" ");

  let aiResponse = null;
  try {
    const res = await $fetch("/api/aiChat", {
      method: "POST",
      body: {
        userMessage: userContent,
        aiUser: personaKey,
        history: [
          { sender: personaDisplay, content: parent.content || "" },
          { sender: "user", content: userContent },
        ],
        extra_system: extraSystem,
      },
    });
    aiResponse =
      res?.aiResponse ||
      res?.data?.aiResponse ||
      res?.data?.message ||
      res?.message ||
      res?.reply ||
      (typeof res === "string" ? res : null);
  } catch (err) {
    console.error("[messages.post] aiChat follow-up failed:", err?.message || err);
  }

  const content = deParrot(aiResponse, userContent, personaDisplay);

  const insertPayload = {
    thread_id: threadId,
    sender_kind: "bot",
    sender_user_id: personaRow.profile?.user_id || null,
    message_type: "persona_followup",
    reply_to_message_id: replyToMessageId,
    content,
    visible: true,
    meta: {
      persona_id: personaRow.id,
      persona_key: personaRow.persona_key,
      persona_displayname: personaDisplay,
      persona_avatar_url: personaRow.profile?.avatar_url || null,
      persona_slug: personaRow.profile?.slug || null,
    },
  };

  const { error: insErr } = await supa.from("messages_v2").insert(insertPayload);
  if (insErr && insErr.code !== "23505") {
    console.error("[messages.post] insert follow-up error:", insErr);
  }

  // Update stats
  const { error: statsErr } = await supa.from("thread_persona_stats").upsert(
    {
      thread_id: threadId,
      persona_id: personaRow.id,
      reply_count: (stats?.reply_count ?? 0) + 1,
      last_reply_at: new Date().toISOString(),
    },
    { onConflict: "thread_id,persona_id" }
  );
  if (statsErr) {
    console.error("[messages.post] stats update error:", statsErr);
  }
}
