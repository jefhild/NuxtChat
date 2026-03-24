import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { normalizeAboutLocale } from "~/server/utils/aboutContent";
import { translateAboutSections } from "~/server/utils/aboutContentTranslation";

export default defineEventHandler(async (event) => {
  try {
    const runtimeConfig = useRuntimeConfig();
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const body = (await readBody(event)) || {};
    const sourceLocale = normalizeAboutLocale(body.sourceLocale || "en");
    const targetLocalesRaw = Array.isArray(body.targetLocales)
      ? body.targetLocales
      : body.targetLocale
      ? [body.targetLocale]
      : [];
    const overwrite = Boolean(body.overwrite);
    const sections = Array.isArray(body.sections) ? body.sections : [];

    const result = await translateAboutSections({
      runtimeConfig,
      supabase,
      sourceLocale,
      targetLocales: targetLocalesRaw,
      sections,
      overwrite,
    });

    return {
      success: true,
      translated: result.translated,
      skipped: result.skipped,
    };
  } catch (error: any) {
    console.error("[admin/about-content/translate] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.message || "Unable to translate About content.",
    };
  }
});

