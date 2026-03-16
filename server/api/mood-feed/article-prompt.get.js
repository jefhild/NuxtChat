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

const pickPromptText = (rows = [], locale = "en") => {
  const exact = rows.find((row) => row?.locale === locale);
  const fallback = rows.find((row) => row?.locale === "en");
  const selected = exact || fallback || rows[0] || null;
  return String(selected?.prompt_text || "").trim();
};

const pickEntryText = (entry, locale = "en") => {
  const rows = Array.isArray(entry?.mood_feed_entry_translations)
    ? entry.mood_feed_entry_translations
    : [];
  const exact = rows.find((row) => row?.locale === locale);
  const fallback = rows.find((row) => row?.locale === "en");
  const selected = exact || fallback || null;
  return (
    String(selected?.refined_text || "").trim() ||
    String(entry?.refined_text || "").trim()
  );
};

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {};
  const locale = normalizeLocale(query.locale || "en");
  const promptKey = String(query.promptKey || query.prompt_key || "").trim();
  const articleSlug = String(query.articleSlug || query.article_slug || "").trim();

  if (!promptKey && !articleSlug) {
    throw createError({
      statusCode: 400,
      statusMessage: "promptKey or articleSlug required",
    });
  }

  let user = null;
  try {
    user = await serverSupabaseUser(event);
  } catch (err) {
    const message = err?.cause?.statusMessage || err?.message || "";
    if (!message.includes("Auth session missing")) throw err;
  }

  const supabase = await getServiceRoleClient(event);
  let promptRow = null;

  if (promptKey) {
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
      .eq("prompt_key", promptKey)
      .limit(1)
      .maybeSingle();

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
        .eq("prompt_key", promptKey)
        .limit(1)
        .maybeSingle();
    }

    if (result?.error) {
      throw createError({ statusCode: 500, statusMessage: result.error.message });
    }
    promptRow = result?.data || null;
  } else {
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
      .eq("related_article_slug", articleSlug)
      .eq("is_active", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

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
        .limit(50);
      if (result?.error) {
        throw createError({ statusCode: 500, statusMessage: result.error.message });
      }
      promptRow =
        (result?.data || []).find(
          (row) => String(row?.related_article_slug || "").trim() === articleSlug
        ) || null;
    } else {
      if (result?.error) {
        throw createError({ statusCode: 500, statusMessage: result.error.message });
      }
      promptRow = result?.data || null;
    }
  }

  if (!promptRow?.prompt_key) {
    return { prompt: null, viewerEntry: null };
  }

  let viewerEntry = null;
  if (user?.id) {
    const { data: entry, error: entryError } = await supabase
      .from("mood_feed_entries")
      .select(
        [
          "id",
          "prompt_key",
          "refined_text",
          "source_locale",
          "status",
          "created_at",
          "mood_feed_entry_translations (locale, refined_text, source_locale)",
        ].join(",")
      )
      .eq("user_id", user.id)
      .eq("prompt_key", promptRow.prompt_key)
      .order("created_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    if (entryError) {
      throw createError({ statusCode: 500, statusMessage: entryError.message });
    }

    if (entry?.id) {
      viewerEntry = {
        id: entry.id,
        status: entry.status || "published",
        createdAt: entry.created_at || null,
        text: pickEntryText(entry, locale),
      };
    }
  }

  return {
    prompt: {
      key: promptRow.prompt_key,
      text: pickPromptText(promptRow.mood_feed_prompt_translations || [], locale),
      relatedArticleSlug: promptRow.related_article_slug || null,
      isActive: promptRow.is_active !== false,
    },
    viewerEntry,
  };
});
