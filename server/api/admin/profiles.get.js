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

    const { data, error } = await supa.rpc("get_all_profiles_1", {
      p_is_ai: typeof isAi === "boolean" ? isAi : null,
    });

    if (error) {
      console.error("[admin/profiles] rpc error:", error);
      setResponseStatus(event, 500);
      return { error: { stage: "rpc_profiles", message: error.message } };
    }

    const items = Array.isArray(data) ? data : [];
    const userIds = items.map((p) => p.user_id).filter(Boolean);

    let extraByUserId = new Map();
    if (userIds.length) {
      const pending = new Set(userIds);
      const perPage = 1000;
      for (let page = 1; page <= 20 && pending.size; page += 1) {
        const { data: listData, error: listErr } =
          await supa.auth.admin.listUsers({ page, perPage });

        if (listErr) {
          console.error("[admin/profiles] auth users error:", listErr);
          setResponseStatus(event, 500);
          return {
            error: { stage: "auth_users", message: listErr.message },
          };
        }

        const users = listData?.users || [];
        for (const userRow of users) {
          if (pending.has(userRow.id)) {
            extraByUserId.set(userRow.id, {
              id: userRow.id,
              email: userRow.email || null,
            });
            pending.delete(userRow.id);
          }
        }

        if (users.length < perPage) break;
      }
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

    const merged = items.map((row) => {
      const extra = extraByUserId.get(row.user_id);
      return {
        ...row,
        email: extra?.email ?? row.email ?? null,
        created: row.created ?? null,
        profile_translations: translationsByUserId.get(row.user_id) || [],
      };
    });

    return { items: merged };
  } catch (err) {
    console.error("[admin/profiles] error:", err);
    setResponseStatus(event, 500);
    return {
      error: { stage: "unhandled", message: err?.message || "Internal error" },
    };
  }
});
