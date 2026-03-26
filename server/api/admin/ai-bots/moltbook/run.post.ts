import { readBody, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { runHoneyMoltbookAutopost } from "~/server/utils/honeyMoltbook";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event)) || {}) as {
      limit?: number;
      dry_run?: boolean;
    };

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const result = await runHoneyMoltbookAutopost({
      event,
      supabase,
      limit: body.limit,
      dryRun: Boolean(body.dry_run),
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("[admin/ai-bots][moltbook] run error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error:
        error?.statusMessage || error?.message || "Unable to run honey Moltbook posts",
    };
  }
});
