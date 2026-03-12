import { createError, getQuery, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { getArticleTranslationJob } from "~/server/utils/articleTranslationQueue";

export default defineEventHandler(async (event) => {
  try {
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const query = getQuery(event);
    const articleId = String(query.articleId || "").trim();
    const jobId = String(query.jobId || "").trim();

    if (!articleId && !jobId) {
      throw createError({
        statusCode: 400,
        statusMessage: "articleId or jobId is required",
      });
    }

    const job = getArticleTranslationJob({
      articleId: articleId || null,
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
