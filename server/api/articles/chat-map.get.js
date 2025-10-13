// server/api/articles/chat-map.get.js
import { useDb } from "@/composables/useDB";

export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event);
  const { getServerClientFrom } = useDb();
  const supa = getServerClientFrom(
    cfg.public.SUPABASE_URL,
    cfg.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supa
    .from("threads")
    .select("id, article_id")
    .eq("kind", "article");

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message });
  }

  const map = {};
  for (const t of data || []) {
    if (t.article_id) map[t.article_id] = t.id;
  }
  return map;
});
