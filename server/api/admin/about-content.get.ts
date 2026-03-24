import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  fetchAboutSectionTranslations,
  normalizeAboutLocale,
} from "~/server/utils/aboutContent";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const locale = normalizeAboutLocale(query.locale || "en");
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

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
      error: err?.statusMessage || err?.message || "Unable to load About content.",
      storageReady: false,
      sections: [],
    };
  }
});

