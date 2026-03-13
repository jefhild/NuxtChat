import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { enqueueSeoPageTranslationJob } from "~/server/utils/seoPageTranslationQueue";
import { normalizeLocaleCode } from "~/server/utils/seoPages";

export default defineEventHandler(async (event) => {
  try {
    const config = useRuntimeConfig();
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const body = (await readBody(event)) || {};
    const pageId = String(body.pageId || "").trim();
    const targetLocalesRaw = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : body.targetLocale
      ? [body.targetLocale]
      : [];
    const sourceLocale = normalizeLocaleCode(body.sourceLocale || "en");
    const overwrite = Boolean(body.overwrite);

    const targetLocales = Array.from(
      new Set(targetLocalesRaw.map((locale: unknown) => normalizeLocaleCode(locale)).filter(Boolean))
    ).filter((locale) => locale !== sourceLocale);

    if (!pageId || !targetLocales.length) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing translation parameters." };
    }

    const job = enqueueSeoPageTranslationJob({
      runtimeConfig: config,
      pageId,
      targetLocales,
      sourceLocale,
      overwrite,
    });

    return {
      success: true,
      queued: true,
      job,
    };
  } catch (error) {
    const err = error as any;
    console.error("[admin/seo-pages/translate] error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.message || "Unable to translate SEO page.",
    };
  }
});
