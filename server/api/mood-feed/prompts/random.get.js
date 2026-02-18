import { serverSupabaseUser } from "#supabase/server";
import { getServiceRoleClient } from "~/server/utils/aiBots";

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

const pickRandom = (list = []) =>
  list[Math.floor(Math.random() * list.length)];

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event);
  const query = getQuery(event) || {};
  const locale = normalizeLocale(query.locale || "en");
  const supabase = await getServiceRoleClient(event);

  const fetchByLocale = async (loc) => {
    const { data } = await supabase
      .from("mood_feed_prompt_translations")
      .select("prompt_id, prompt_text, mood_feed_prompts(prompt_key,is_active)")
      .eq("locale", loc)
      .limit(200);
    return (data || []).filter((row) => row?.mood_feed_prompts?.is_active);
  };

  let rows = await fetchByLocale(locale);
  if (!rows.length && locale !== "en") {
    rows = await fetchByLocale("en");
  }

  if (user?.id) {
    const { data: answered } = await supabase
      .from("mood_feed_entries")
      .select("prompt_key")
      .eq("user_id", user.id)
      .not("prompt_key", "is", null);

    const answeredKeys = new Set(
      (answered || [])
        .map((row) => String(row?.prompt_key || "").trim())
        .filter(Boolean)
    );

    rows = rows.filter((row) => {
      const key = String(row?.mood_feed_prompts?.prompt_key || "").trim();
      if (!key) return true;
      return !answeredKeys.has(key);
    });
  }

  const pick = pickRandom(rows);
  if (!pick?.prompt_text) {
    throw createError({ statusCode: 404, statusMessage: "No prompts available" });
  }

  return {
    promptText: pick.prompt_text,
    promptKey: pick.mood_feed_prompts?.prompt_key || null,
  };
});
