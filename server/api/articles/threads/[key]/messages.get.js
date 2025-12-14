import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const key = String(getRouterParam(event, "key") || "");
  if (!key)
    throw createError({ statusCode: 400, statusMessage: "key required" });

  // user is OPTIONAL
  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch {}

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  // 0) Resolve slug | id -> thread { id, slug, title }
  const looksLikeUuid = /^[0-9a-f-]{36}$/i.test(key);
  const sel = "id, slug, title";
  const find = looksLikeUuid
    ? supa.from("threads").select(sel).eq("id", key).maybeSingle()
    : supa.from("threads").select(sel).eq("slug", key).maybeSingle();

  const { data: thread, error: tErr } = await find;
  if (tErr) throw createError({ statusCode: 500, statusMessage: tErr.message });
  if (!thread)
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });

  const threadId = thread.id;

  // 1) Base messages
  const { data: msgs, error: mErr } = await supa
    .from("messages_v2")
    .select(
      "id, thread_id, reply_to_message_id, sender_kind, content, created_at, sender_user_id, masked, deleted, meta, message_type"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (mErr) throw createError({ statusCode: 500, statusMessage: mErr.message });

  // Short-circuit: still return thread meta even if no messages (helps UI/realtime)
  if (!msgs?.length) return { thread, items: [] };

  const msgIds = msgs.map((m) => m.id);
  const authorIds = Array.from(
    new Set(msgs.map((m) => m.sender_user_id).filter(Boolean))
  );

  // console.log("getting msgs:", msgs);

  // 2) Aggregates
  const [{ data: scores, error: sErr }, { data: todays, error: tErr2 }] =
    await Promise.all([
      supa
        .from("message_scores")
        .select("message_id, score, upvotes, downvotes")
        .in("message_id", msgIds),
      supa
        .from("message_scores_today")
        .select("message_id, today")
        .in("message_id", msgIds),
    ]);
  if (sErr) throw createError({ statusCode: 500, statusMessage: sErr.message });
  if (tErr2)
    throw createError({ statusCode: 500, statusMessage: tErr2.message });

  // console.log("getting scores:", scores);

  // 3) Profiles (by user_id)
 let profMap = new Map();
 if (authorIds.length) {
  const { data: profs, error: pErr } = await supa
    .from("profiles")
    .select(
      `
      user_id,
      displayname,
      avatar_url,
      bio,
      site_url,
      gender_id,
      genders:gender_id ( id, name ),
      country_id,
      countries:country_id ( id, name, emoji ),
      created,
      last_active,
      slug
    `
    )
    .in("user_id", authorIds);
   if (pErr)
     throw createError({ statusCode: 500, statusMessage: pErr.message });
   profMap = new Map((profs || []).map((p) => [p.user_id, p]));
 }

  // 4) Current user votes
  let myVotes = [];
  if (user?.id) {
    const { data, error } = await supa
      .from("votes_messages")
      .select("message_id, value")
      .eq("user_id", user.id)
      .in("message_id", msgIds);
    if (error)
      throw createError({ statusCode: 500, statusMessage: error.message });
    myVotes = data || [];
  }



const toCamelProfile = (p) =>
  p
    ? {
        id: p.user_id,
        displayname: p.displayname ?? null,
        avatarUrl: p.avatar_url ?? null,
        bio: p.bio ?? null,
        websiteUrl: p.site_url ?? null,
        website: p.site_url ?? null, // backward-compat alias

        genderId: p.gender_id ?? null,
        gender: p.genders
          ? {
              id: p.genders.id ?? null,
              name: p.genders.name ?? null,
            }
          : null,

        countryId: p.country_id ?? null,
        country: p.countries
          ? {
              id: p.countries.id ?? null,
              name: p.countries.name ?? null,
              emoji: p.countries.emoji ?? null,
            }
          : null,
        countryName: p.countries?.name ?? null, // convenience
        countryEmoji: p.countries?.emoji ?? null, // convenience
        createdAt: p.created ?? null,
        lastActive: p.last_active ?? null,
        slug: p.slug ?? null,
      }
    : null;




  // console.log("getting profile info:", profs);



  // 5) Merge
  const scoreMap = new Map((scores || []).map((r) => [r.message_id, r]));
  const todayMap = new Map((todays || []).map((r) => [r.message_id, r.today]));
  const myMap = new Map((myVotes || []).map((r) => [r.message_id, r.value]));

  const items = (msgs || []).map((m) => {
    const prof = profMap.get(m.sender_user_id) || null;
    let author = toCamelProfile(prof);

    // Persona/bot fallback using meta
    if (!author && m.sender_kind !== "user" && m.meta) {
      const meta = m.meta || {};
      const displayname =
        meta.persona_displayname || meta.persona_key || "AI participant";
      author = {
        id: meta.persona_id || null,
        displayname,
        avatarUrl: meta.persona_avatar_url || null,
        slug: meta.persona_slug || null,
      };
    }

    const displayname =
      author?.displayname ||
      (m.sender_kind !== "user"
        ? m.meta?.persona_displayname || m.meta?.persona_key || "AI participant"
        : "User");
    const avatarUrl =
      author?.avatarUrl ||
      (m.sender_kind !== "user" ? m.meta?.persona_avatar_url || null : null);

    const agg = scoreMap.get(m.id) || {};
    return {
      id: m.id,
      replyToMessageId: m.reply_to_message_id,
      senderKind: m.sender_kind,
      content: m.content,
      createdAt: m.created_at,
      authorId: m.sender_user_id,
      // legacy view fields
      displayname,
      avatarUrl,
      // full profile object + convenience slug
      author,
      authorSlug: author?.slug ?? null,
      masked: m.masked,
      deleted: m.deleted,
      score: agg.score ?? 0,
      upvotes: agg.upvotes ?? 0,
      downvotes: agg.downvotes ?? 0,
      today: todayMap.get(m.id) ?? 0,
      myVote: user?.id ? myMap.get(m.id) ?? 0 : 0,
    };
  });

  return { thread, items };
});
