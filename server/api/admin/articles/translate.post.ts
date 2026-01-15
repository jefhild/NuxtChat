import OpenAI from "openai";
import { getServiceRoleClient } from "~/server/utils/aiBots";

const sanitizeJsonResponse = (input = "") => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const cleaned = trimmed
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();
  try {
    const parsed = JSON.parse(cleaned);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const normalizeLocale = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    if (!config.OPENAI_API_KEY) {
      setResponseStatus(event, 400);
      return { success: false, error: "OPENAI_API_KEY is not configured" };
    }

    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const targetLocalesRaw = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : body.targetLocale
      ? [body.targetLocale]
      : [];
    const sourceLocale = normalizeLocale(body.sourceLocale) || "en";
    const overwrite = Boolean(body.overwrite);

    const targetLocales = Array.from(
      new Set(
        targetLocalesRaw
          .map((locale: unknown) => normalizeLocale(locale))
          .filter(Boolean)
      )
    ).filter((locale) => locale !== sourceLocale);

    if (!articleId || !targetLocales.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing translation parameters." };
    }

    const supabase = await getServiceRoleClient(event);
    const { data: article, error: articleError } = await supabase
      .from("articles")
      .select(
        `
        id,
        title,
        content,
        rewrite_meta,
        newsmesh_meta,
        original_language_code
      `
      )
      .eq("id", articleId)
      .maybeSingle();

    if (articleError) throw articleError;
    if (!article) {
      setResponseStatus(event, 404);
      return { success: false, error: "Article not found." };
    }

    const rewriteMeta = (article.rewrite_meta || {}) as Record<string, any>;
    const headline = rewriteMeta.headline || article.title || "";
    const summary =
      rewriteMeta.summary ||
      article.newsmesh_meta?.summary ||
      article.newsmesh_meta?.description ||
      "";
    const bodyText = rewriteMeta.body || article.content || "";
    const social = rewriteMeta.social || null;
    const references = rewriteMeta.references || [];

    if (!headline && !bodyText) {
      setResponseStatus(event, 400);
      return { success: false, error: "No rewrite content to translate." };
    }

    const existingLocales = new Set<string>();
    if (!overwrite) {
      const { data: existing, error: existingError } = await supabase
        .from("article_translations")
        .select("locale")
        .eq("article_id", articleId)
        .in("locale", targetLocales);

      if (existingError) throw existingError;
      (existing || []).forEach((row) => {
        if (row?.locale) existingLocales.add(String(row.locale));
      });
    }

    const openai = new OpenAI({ apiKey: config.OPENAI_API_KEY });
    const model = config.OPENAI_MODEL || "gpt-4.1-mini";

    const translated: string[] = [];
    const skipped: string[] = [];

    for (const targetLocale of targetLocales) {
      if (!overwrite && existingLocales.has(targetLocale)) {
        skipped.push(targetLocale);
        continue;
      }

      const userPrompt = [
        `Translate from ${sourceLocale} to ${targetLocale}.`,
        "Return JSON only with keys: headline, summary, body, social.",
        "Preserve URLs, proper names, and existing hashtags.",
        "",
        `Headline: ${headline}`,
        summary ? `Summary: ${summary}` : "",
        bodyText ? `Body: ${bodyText}` : "",
        social?.facebook?.caption
          ? `Facebook caption: ${social.facebook.caption}`
          : "",
        social?.instagram?.caption
          ? `Instagram caption: ${social.instagram.caption}`
          : "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await openai.chat.completions.create({
        model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content:
              "You translate article rewrites. Return JSON only with keys: headline, summary, body, social.",
          },
          { role: "user", content: userPrompt },
        ],
      });

      const content = response.choices?.[0]?.message?.content || "";
      const parsed = sanitizeJsonResponse(content);
      if (!parsed?.headline && !parsed?.body) {
        throw new Error("Failed to parse article translation.");
      }

      const translationPayload = {
        article_id: articleId,
        locale: targetLocale,
        headline:
          typeof parsed.headline === "string" ? parsed.headline.trim() : "",
        summary:
          typeof parsed.summary === "string" ? parsed.summary.trim() : "",
        body: typeof parsed.body === "string" ? parsed.body.trim() : "",
        references_jsonb: references,
        social:
          typeof parsed.social === "object" && parsed.social !== null
            ? parsed.social
            : social,
        provider: "openai",
        model,
        source_language_code:
          article.original_language_code || sourceLocale || null,
        translated_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: upsertError } = await supabase
        .from("article_translations")
        .upsert(translationPayload, { onConflict: "article_id,locale" });

      if (upsertError) throw upsertError;
      translated.push(targetLocale);
    }

    return { success: true, translated, skipped };
  } catch (error) {
    const err = error as any;
    console.error("[admin/articles/translate] error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.message || "Unable to translate article.",
    };
  }
});
