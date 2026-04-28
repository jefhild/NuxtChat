import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  fetchWeeklyDigestContent,
  normalizeWeeklyDigestLocale,
} from "~/server/utils/weeklyDigestContent";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const locale = normalizeWeeklyDigestLocale(query.locale || "en");
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const response = await fetchWeeklyDigestContent(supabase, locale);
    return {
      success: true,
      locale,
      storageReady: response.storageReady,
      content: response.content,
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to load weekly digest content.",
      storageReady: false,
      content: {
        locale: "en",
        enabled: true,
        title: "",
        body: "",
        ctaLabel: "",
        ctaUrl: "",
        hasOverride: false,
      },
    };
  }
});
