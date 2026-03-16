import { getServiceRoleClient } from "~/server/utils/aiBots";
import { buildMoodPromptSlug } from "@/utils/moodPromptSlug";

const normalizeLocale = (value) => {
  const code = String(value || "").trim().toLowerCase();
  if (!code) return "en";
  if (code.startsWith("zh")) return "zh";
  if (code.startsWith("fr")) return "fr";
  if (code.startsWith("ru")) return "ru";
  return "en";
};

const pickPromptText = (rows = [], locale = "en") => {
  const exact = rows.find((row) => row?.locale === locale);
  const fallback = rows.find((row) => row?.locale === "en");
  const selected = exact || fallback || rows[0] || null;
  return String(selected?.prompt_text || "").trim();
};

const pickCanonicalPromptText = (rows = []) => {
  const english = rows.find((row) => row?.locale === "en");
  const selected = english || rows[0] || null;
  return String(selected?.prompt_text || "").trim();
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {};
  const locale = normalizeLocale(query.locale || "en");
  const slug = String(query.slug || "").trim();

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: "slug required" });
  }

  const supabase = await getServiceRoleClient(event);
  let result = await supabase
    .from("mood_feed_prompts")
    .select(
      [
        "id",
        "prompt_key",
        "related_article_slug",
        "is_active",
        "updated_at",
        "mood_feed_prompt_translations (locale, prompt_text, source_locale)",
      ].join(",")
    )
    .eq("is_active", true)
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(250);

  if (
    result?.error &&
    String(result.error?.message || "").includes("related_article_slug")
  ) {
    result = await supabase
      .from("mood_feed_prompts")
      .select(
        [
          "id",
          "prompt_key",
          "is_active",
          "updated_at",
          "mood_feed_prompt_translations (locale, prompt_text, source_locale)",
        ].join(",")
      )
      .eq("is_active", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(250);
  }

  if (result?.error) {
    throw createError({ statusCode: 500, statusMessage: result.error.message });
  }

  const matched = (result?.data || []).find((prompt) => {
    const promptText = pickCanonicalPromptText(prompt?.mood_feed_prompt_translations || []);
    return buildMoodPromptSlug({
      promptText,
      promptKey: prompt?.prompt_key,
    }) === slug;
  });

  if (!matched?.prompt_key) {
    throw createError({ statusCode: 404, statusMessage: "Prompt not found" });
  }

  return {
    id: matched.id,
    promptKey: matched.prompt_key,
    promptText:
      pickPromptText(matched.mood_feed_prompt_translations || [], locale) ||
      matched.prompt_key,
    promptSlug: buildMoodPromptSlug({
      promptText: pickCanonicalPromptText(matched.mood_feed_prompt_translations || []),
      promptKey: matched.prompt_key,
    }),
    relatedArticleSlug: matched.related_article_slug || null,
  };
});
