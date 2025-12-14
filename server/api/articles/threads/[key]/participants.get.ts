import { useDb } from "@/composables/useDB";

const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

export default defineEventHandler(async (event) => {
  const key = String(getRouterParam(event, "key") || "");
  if (!key) {
    throw createError({ statusCode: 400, statusMessage: "key required" });
  }

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Resolve thread (slug or id)
    const threadQuery = isUuid(key)
      ? supa
          .from("threads")
          .select("id, slug, article_id")
          .eq("id", key)
          .maybeSingle()
      : supa
          .from("threads")
          .select("id, slug, article_id")
          .eq("slug", key)
          .maybeSingle();

    const { data: thread, error: threadErr } = await threadQuery;
    if (threadErr)
      throw createError({ statusCode: 500, statusMessage: threadErr.message });
    if (!thread)
      throw createError({ statusCode: 404, statusMessage: "Thread not found" });

    const threadId = thread.id;

    // Fetch article category
    let categoryId: string | null = null;
    if (thread.article_id) {
      const { data: article, error: artErr } = await supa
        .from("articles")
        .select("id, category_id")
        .eq("id", thread.article_id)
        .maybeSingle();
      if (artErr)
        throw createError({ statusCode: 500, statusMessage: artErr.message });
      categoryId = article?.category_id || null;
    }

    // Ensure category personas are enrolled
    if (categoryId) {
      const { data: personas, error: pErr } = await supa
        .from("ai_personas")
        .select("id")
        .eq("category_id", categoryId)
        .eq("is_active", true);
      if (pErr)
        throw createError({ statusCode: 500, statusMessage: pErr.message });

      if (Array.isArray(personas) && personas.length) {
        const inserts = personas.map((p) => ({
          thread_id: threadId,
          persona_id: p.id,
          kind: "persona",
        }));
        const { error: insErr } = await supa
          .from("thread_participants")
          .upsert(inserts, {
            onConflict: "thread_id,persona_id",
            ignoreDuplicates: true,
          });
        if (insErr && insErr.code !== "23505") {
          throw createError({ statusCode: 500, statusMessage: insErr.message });
        }
      }
    }

    // Load participants
    const { data: rows, error: rowsErr } = await supa
      .from("thread_participants")
      .select("id, kind, user_id, persona_id, joined_at, last_seen_at")
      .eq("thread_id", threadId);
    if (rowsErr)
      throw createError({ statusCode: 500, statusMessage: rowsErr.message });

    const userIds = Array.from(
      new Set((rows || []).map((r) => r.user_id).filter(Boolean))
    );
    const personaIds = Array.from(
      new Set((rows || []).map((r) => r.persona_id).filter(Boolean))
    );

    let usersById = new Map();
    if (userIds.length) {
      const { data: profs, error: profErr } = await supa
        .from("profiles")
        .select("user_id, displayname, avatar_url, slug, gender_id")
        .in("user_id", userIds);
      if (profErr)
        throw createError({ statusCode: 500, statusMessage: profErr.message });
      usersById = new Map((profs || []).map((p) => [p.user_id, p]));
    }

    let personasById = new Map();
    if (personaIds.length) {
      const { data: personaRows, error: personaErr } = await supa
        .from("ai_personas")
        .select(
          `
            id,
            persona_key,
            is_active,
            category:category_id ( id, name, slug ),
            profile:profiles!ai_personas_profile_user_id_fkey (
              user_id,
              displayname,
              avatar_url,
              slug
            )
          `
        )
        .in("id", personaIds);
      if (personaErr)
        throw createError({ statusCode: 500, statusMessage: personaErr.message });
      personasById = new Map((personaRows || []).map((p) => [p.id, p]));
    }

    const participants = (rows || []).map((row) => {
      const user = row.user_id ? usersById.get(row.user_id) || null : null;
      const persona = row.persona_id
        ? personasById.get(row.persona_id) || null
        : null;
      return {
        id: row.id,
        kind: row.kind,
        joinedAt: row.joined_at,
        lastSeenAt: row.last_seen_at,
        user: user
          ? {
            id: user.user_id,
            displayname: user.displayname,
            avatar_url: user.avatar_url,
            slug: user.slug,
            gender_id: user.gender_id,
          }
          : null,
        persona: persona
          ? {
            id: persona.id,
            persona_key: persona.persona_key,
            is_active: persona.is_active,
            category: persona.category || null,
            profile: persona.profile || null,
          }
          : null,
      };
    });

    return { success: true, threadId, participants };
  } catch (err: any) {
    if (err.statusCode) throw err;
    console.error("[participants.get] error:", err);
    throw createError({ statusCode: 500, statusMessage: err?.message || "Failed to load participants" });
  }
});
