import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const minutesRaw = Number(q.minutes ?? 10);
  const minutes =
    Number.isFinite(minutesRaw) && minutesRaw > 0
      ? Math.min(minutesRaw, 180)
      : 10;

  const cutoffIso = new Date(Date.now() - minutes * 60 * 1000).toISOString();

  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const [{ data: presenceData, error: presenceError }, { data: profileData, error: profileError }] =
    await Promise.all([
      supa
        .from("presence")
        .select("user_id")
        .gte("last_seen_at", cutoffIso),
      supa
        .from("profiles")
        .select("user_id")
        .gte("last_active", cutoffIso),
    ]);

  if (presenceError || profileError) {
    throw createError({
      statusCode: 500,
      statusMessage: (presenceError || profileError).message,
    });
  }

  const ids = [
    ...(presenceData || []).map((row) => row.user_id),
    ...(profileData || []).map((row) => row.user_id),
  ].filter(Boolean);

  const uniqueIds = Array.from(new Set(ids));

  return { ids: uniqueIds, minutes, cutoff: cutoffIso };
});
