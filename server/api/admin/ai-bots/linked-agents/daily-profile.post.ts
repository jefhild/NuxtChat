import { readBody, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { runLinkedAgentsDailyProfilePost } from "~/server/utils/linkedAgents";

type HandlerError = {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  data?: unknown;
};

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event).catch(() => ({}))) || {}) as {
      dry_run?: boolean;
    };

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const result = await runLinkedAgentsDailyProfilePost({
      event,
      supabase,
      dryRun: Boolean(body.dry_run),
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const handlerError = error as HandlerError;
    console.error("[admin/ai-bots][linked-agents] daily profile error:", error);
    setResponseStatus(event, handlerError?.statusCode || 500);
    return {
      success: false,
      error:
        handlerError?.statusMessage ||
        handlerError?.message ||
        "Unable to run LinkedAgents daily profile post",
      ...(handlerError?.data ? { details: handlerError.data } : {}),
    };
  }
});
