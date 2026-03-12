import { getOpenAIClient } from "@/server/utils/openaiGateway";

export const sanitizeJsonResponse = (input = "") => {
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

export const normalizeTranslationLocale = (value: unknown) =>
  String(value || "")
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();

const createServiceRoleClient = async (runtimeConfig: any) => {
  const { useDb } = await import("@/composables/useDB");
  const { getServerClientFrom } = useDb();
  return getServerClientFrom(
    runtimeConfig.public.SUPABASE_URL,
    runtimeConfig.SUPABASE_SERVICE_ROLE_KEY
  );
};

export const translateArticle = async ({
  runtimeConfig,
  articleId,
  targetLocales,
  sourceLocale,
  overwrite = false,
  onProgress,
}: {
  runtimeConfig: any;
  articleId: string;
  targetLocales: string[];
  sourceLocale: string;
  overwrite?: boolean;
  onProgress?: (payload: {
    status: string;
    currentLocale?: string | null;
    completedLocales?: string[];
    skippedLocales?: string[];
    error?: string | null;
  }) => void;
}) => {
  const { client: openai, apiKey, model } = getOpenAIClient({
    runtimeConfig,
    model: runtimeConfig.OPENAI_MODEL || "gpt-4.1-mini",
  });

  if (!apiKey || !openai) {
    const error = new Error("OPENAI_API_KEY is not configured");
    (error as any).statusCode = 400;
    throw error;
  }

  const normalizedSource = normalizeTranslationLocale(sourceLocale) || "en";
  const normalizedTargets = Array.from(
    new Set(
      (Array.isArray(targetLocales) ? targetLocales : []).map(
        normalizeTranslationLocale
      )
    )
  ).filter((locale) => locale && locale !== normalizedSource);

  if (!articleId || !normalizedTargets.length) {
    const error = new Error("Missing translation parameters.");
    (error as any).statusCode = 400;
    throw error;
  }

  const supabase = await createServiceRoleClient(runtimeConfig);
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
    const error = new Error("Article not found.");
    (error as any).statusCode = 404;
    throw error;
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
    const error = new Error("No rewrite content to translate.");
    (error as any).statusCode = 400;
    throw error;
  }

  const existingLocales = new Set<string>();
  if (!overwrite) {
    const { data: existing, error: existingError } = await supabase
      .from("article_translations")
      .select("locale")
      .eq("article_id", articleId)
      .in("locale", normalizedTargets);

    if (existingError) throw existingError;
    (existing || []).forEach((row) => {
      if (row?.locale) existingLocales.add(String(row.locale));
    });
  }

  const translated: string[] = [];
  const skipped: string[] = [];
  onProgress?.({
    status: "running",
    completedLocales: translated,
    skippedLocales: skipped,
  });

  for (const targetLocale of normalizedTargets) {
    if (!overwrite && existingLocales.has(targetLocale)) {
      skipped.push(targetLocale);
      onProgress?.({
        status: "running",
        currentLocale: targetLocale,
        completedLocales: [...translated],
        skippedLocales: [...skipped],
      });
      continue;
    }

    onProgress?.({
      status: "running",
      currentLocale: targetLocale,
      completedLocales: [...translated],
      skippedLocales: [...skipped],
    });

    const userPrompt = [
      `Translate from ${normalizedSource} to ${targetLocale}.`,
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
        article.original_language_code || normalizedSource || null,
      translated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error: upsertError } = await supabase
      .from("article_translations")
      .upsert(translationPayload, { onConflict: "article_id,locale" });

    if (upsertError) throw upsertError;
    translated.push(targetLocale);
    onProgress?.({
      status: "running",
      currentLocale: targetLocale,
      completedLocales: [...translated],
      skippedLocales: [...skipped],
    });
  }

  return { translated, skipped };
};
