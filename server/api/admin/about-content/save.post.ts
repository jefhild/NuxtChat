import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  fetchAboutSectionTranslations,
  isMissingAboutTableError,
  normalizeAboutLocale,
  sanitizeAboutSectionPayload,
} from "~/server/utils/aboutContent";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event)) || {}) as Record<string, unknown>;
    const locale = normalizeAboutLocale(body.locale || "en");
    const sections = Array.isArray(body.sections)
      ? body.sections.map(sanitizeAboutSectionPayload).filter(Boolean)
      : [];

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const toDelete = sections
      .filter((section) => !section.title && !section.body)
      .map((section) => section.key);

    if (toDelete.length) {
      const { error: deleteError } = await supabase
        .from("about_page_translations")
        .delete()
        .eq("locale", locale)
        .in("section_key", toDelete);

      if (deleteError && !isMissingAboutTableError(deleteError)) {
        throw deleteError;
      }
    }

    const toUpsert = sections
      .filter((section) => section.title || section.body)
      .map((section) => ({
        section_key: section.key,
        locale,
        title: section.title,
        body: section.body,
        updated_at: new Date().toISOString(),
      }));

    if (toUpsert.length) {
      const { error: upsertError } = await supabase
        .from("about_page_translations")
        .upsert(toUpsert, {
          onConflict: "section_key,locale",
        });

      if (upsertError) throw upsertError;
    }

    const response = await fetchAboutSectionTranslations(supabase, locale);
    return {
      success: true,
      locale,
      storageReady: response.storageReady,
      sections: response.sections,
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to save About content.",
    };
  }
});

