import { getQuery, readBody, setResponseStatus } from "h3";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAutomationSecret } from "~/server/utils/internalAutomationAuth";
import { runLinkedAgentsDailyProfilePost } from "~/server/utils/linkedAgents";

type HandlerError = {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  data?: unknown;
};

export default defineEventHandler(async (event) => {
  try {
    ensureAutomationSecret(event);

    const query = getQuery(event);
    const body = ((await readBody(event).catch(() => ({}))) || {}) as {
      dry_run?: boolean;
    };
    const dryRun =
      String(body.dry_run ?? query.dry_run ?? "").trim().toLowerCase() === "true";

    const supabase = await getServiceRoleClient(event);
    const result = await runLinkedAgentsDailyProfilePost({
      event,
      supabase,
      dryRun,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: unknown) {
    const handlerError = error as HandlerError;
    console.error("[internal][linked-agents][daily-profile] error:", error);
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
