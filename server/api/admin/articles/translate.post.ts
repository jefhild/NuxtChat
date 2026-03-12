import { enqueueArticleTranslationJob } from "~/server/utils/articleTranslationQueue";
import {
  normalizeTranslationLocale,
  translateArticle,
} from "~/server/utils/articleTranslation";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();

    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const targetLocalesRaw = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : body.targetLocale
      ? [body.targetLocale]
      : [];
    const sourceLocale = normalizeTranslationLocale(body.sourceLocale) || "en";
    const overwrite = Boolean(body.overwrite);

    const targetLocales = Array.from(
      new Set(
        targetLocalesRaw
          .map((locale: unknown) => normalizeTranslationLocale(locale))
          .filter(Boolean)
      )
    ).filter((locale) => locale !== sourceLocale);
    const background = Boolean(body.background);

    if (!articleId || !targetLocales.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing translation parameters." };
    }

    if (background) {
      const job = enqueueArticleTranslationJob({
        runtimeConfig: config,
        articleId,
        targetLocales,
        sourceLocale,
        overwrite,
      });
      return {
        success: true,
        queued: true,
        job,
      };
    }

    const result = await translateArticle({
      runtimeConfig: config,
      articleId,
      targetLocales,
      sourceLocale,
      overwrite,
    });

    return { success: true, translated: result.translated, skipped: result.skipped };
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
