import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const userId = String(q.userId || q.id || "").trim() || null;
  const slug = String(q.slug || "").trim() || null;
  if (!userId && !slug) {
    throw createError({ statusCode: 400, statusMessage: "userId or slug required" });
  }

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const profileQuery = supa
    .from("profiles")
    .select("user_id, slug, last_active, is_ai")
    .limit(1);
  const { data: profile, error: profileErr } = userId
    ? await profileQuery.eq("user_id", userId).maybeSingle()
    : await profileQuery.eq("slug", slug).maybeSingle();

  if (profileErr) {
    throw createError({ statusCode: 500, statusMessage: profileErr.message });
  }
  if (!profile?.user_id) {
    throw createError({ statusCode: 404, statusMessage: "Profile not found" });
  }

  const uid = profile.user_id;
  const isAi = Boolean(profile.is_ai);

  return {
    userId: uid,
    lastActive: isAi
      ? new Date().toISOString()
      : profile.last_active ?? null,
    comments: {
      count: 0,
      items: [],
    },
    upvotes: {
      count: 0,
      items: [],
    },
  };
});
