import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { normalizeWeeklyDigestLocale } from "~/server/utils/weeklyDigestContent";
import { translateWeeklyDigestContent } from "~/server/utils/weeklyDigestContentTranslation";

export default defineEventHandler(async (event) => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const body = (await readBody(event)) || {};
    const sourceLocale = normalizeWeeklyDigestLocale(body.sourceLocale || "en");
    const targetLocalesRaw = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : body.targetLocale
        ? [body.targetLocale]
        : [];

    const result = await translateWeeklyDigestContent({
      runtimeConfig,
      supabase,
      sourceLocale,
      targetLocales: targetLocalesRaw,
      content: {
        locale: sourceLocale,
        title: body.title,
        body: body.body,
        ctaLabel: body.ctaLabel,
        ctaUrl: body.ctaUrl,
      },
      overwrite: Boolean(body.overwrite),
    });

    return {
      success: true,
      translated: result.translated,
      skipped: result.skipped,
    };
  } catch (error: any) {
    console.error("[admin/weekly-digest-content/translate] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.message || "Unable to translate weekly digest content.",
    };
  }
});
