import { createError, getQuery, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { getSeoPageTranslationJob } from "~/server/utils/seoPageTranslationQueue";

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const query = getQuery(event);
    const pageId = String(query.pageId || "").trim();
    const jobId = String(query.jobId || "").trim();

    if (!pageId && !jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: "pageId or jobId is required",
      });
    }

    const job = getSeoPageTranslationJob({
      pageId: pageId || null,
      jobId: jobId || null,
    });

    return {
      success: true,
      job,
    };
  } catch (error: any) {
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error: error?.statusMessage || error?.message || "Unable to load translation job",
    };
  }
});
