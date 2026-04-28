import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  fetchWeeklyDigestContent,
  hasWeeklyDigestContent,
  isMissingWeeklyDigestTableError,
  normalizeWeeklyDigestLocale,
  sanitizeWeeklyDigestContentPayload,
  validateWeeklyDigestCtaUrl,
} from "~/server/utils/weeklyDigestContent";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event)) || {}) as Record<string, unknown>;
    const payload = sanitizeWeeklyDigestContentPayload({
      ...body,
      locale: normalizeWeeklyDigestLocale(body.locale || "en"),
    });

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    if (!hasWeeklyDigestContent(payload)) {
      const { error: deleteError } = await supabase
        .from("weekly_digest_content")
        .delete()
        .eq("locale", payload.locale);

      if (deleteError && !isMissingWeeklyDigestTableError(deleteError)) {
        throw deleteError;
      }
    } else {
      const { error: upsertError } = await supabase
        .from("weekly_digest_content")
        .upsert(
          {
            locale: payload.locale,
            enabled: payload.enabled,
            title: payload.title,
            body: payload.body,
            cta_label: payload.ctaLabel,
            cta_url: validateWeeklyDigestCtaUrl(payload.ctaUrl),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "locale" }
        );

      if (upsertError) throw upsertError;
    }

    const response = await fetchWeeklyDigestContent(supabase, payload.locale);
    return {
      success: true,
      locale: payload.locale,
      storageReady: response.storageReady,
      content: response.content,
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to save weekly digest content.",
    };
  }
});
