import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
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
      console.error("[admin/profiles] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

  const query = getQuery(event);
  let isAi = null;
  if (query.is_ai === "true") isAi = true;
  if (query.is_ai === "false") isAi = false;

  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(5000, Math.max(1, parseInt(query.limit) || 5000));
  const offset = (page - 1) * limit;
  const search = String(query.search || "").trim();
  const filter = String(query.filter || "").trim();
  // Skip the expensive auth email lookup for large/bulk requests
  const minimal = query.minimal === "true" || limit > 200;

    const { data, error } = await supa.rpc("get_all_profiles_1", {
      p_is_ai: typeof isAi === "boolean" ? isAi : null,
      p_limit: limit,
      p_offset: offset,
      p_search: search || null,
      p_filter: filter || null,
    });

    if (error) {
      console.error("[admin/profiles] rpc error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "rpc_profiles", message: error.message } };
    }

    const items = Array.isArray(data) ? data : [];
    const total = items.length > 0 ? Number(items[0].total_count ?? 0) : 0;
    const userIds = items.map((p) => p.user_id).filter(Boolean);

    let extraByUserId = new Map();
    if (!minimal && userIds.length) {
      // Fetch emails per-user for the current page only (no full list scan)
      const results = await Promise.allSettled(
        userIds.map((id) => supa.auth.admin.getUserById(id))
      );
      results.forEach((result, i) => {
        const userId = userIds[i];
        const email =
          result.status === "fulfilled"
            ? result.value?.data?.user?.email || null
            : null;
        extraByUserId.set(userId, { id: userId, email });
      });
    }

    let translationsByUserId = new Map();
    if (userIds.length) {
      const { data: translations, error: translationsErr } = await supa
        .from("profile_translations")
        .select("user_id, locale, displayname, bio, tagline, source_locale")
        .in("user_id", userIds);

      if (translationsErr) {
        console.error("[admin/profiles] translations error:", translationsErr);
      } else {
        (translations || []).forEach((row) => {
          const key = row.user_id;
          if (!translationsByUserId.has(key)) translationsByUserId.set(key, []);
          translationsByUserId.get(key).push(row);
        });
      }
    }

    let personaByUserId = new Map();
    if (userIds.length) {
      const { data: personas, error: personaErr } = await supa
        .from("ai_personas")
        .select(
          "profile_user_id, persona_key, is_active, category:categories!ai_personas_category_id_fkey ( id, name, slug )"
        )
        .in("profile_user_id", userIds);

      if (personaErr) {
        console.error("[admin/profiles] personas error:", personaErr);
      } else {
        const byUser = new Map();
        (personas || []).forEach((row) => {
          const key = row.profile_user_id;
          if (!key) return;
          if (!byUser.has(key)) byUser.set(key, []);
          byUser.get(key).push(row);
        });
        byUser.forEach((rows, key) => {
          const active =
            rows.find((row) => row.is_active) || rows[0] || null;
          if (active) personaByUserId.set(key, active);
        });
      }
    }

    const merged = items.map((row) => {
      const extra = extraByUserId.get(row.user_id);
      const persona = personaByUserId.get(row.user_id) || null;
      return {
        ...row,
        total_count: undefined,
        email: extra?.email ?? row.email ?? null,
        created: row.created ?? null,
        profile_translations: translationsByUserId.get(row.user_id) || [],
        ai_persona_key: persona?.persona_key || null,
        ai_category_name: persona?.category?.name || null,
        ai_category_slug: persona?.category?.slug || null,
      };
    });

    return { items: merged, total, page, limit };
  } catch (err) {
    console.error("[admin/profiles] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
