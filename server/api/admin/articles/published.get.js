export default defineEventHandler(async (event) => {
  try {
    const { useDb } = await import("@/composables/useDB");
    const { getServerClientFrom } = useDb();
    const cfg = useRuntimeConfig(event);
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data, error } = await supa
      .from("threads")
      .select("id, article_id")
      .eq("kind", "article");

    if (error) throw error;
    return { success: true, data };
  } catch (e) {
    setResponseStatus(event, 500);
    return { success: false, error: e.message };
  }
});
