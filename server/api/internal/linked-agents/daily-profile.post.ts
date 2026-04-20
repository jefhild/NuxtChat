import { createError, getQuery, readBody, setResponseStatus } from "h3";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAutomationSecret } from "~/server/utils/internalAutomationAuth";
import {
  queueLinkedAgentsDailyProfilePost,
  runLinkedAgentsDailyProfilePost,
} from "~/server/utils/linkedAgents";

const INTERNAL_RUN_TIMEOUT_MS = 11000;

type HandlerError = {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  data?: unknown;
};

const withInternalRunTimeout = async <T>(promise: Promise<T>) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        createError({
          statusCode: 504,
          statusMessage: `LinkedAgents internal run timed out after ${INTERNAL_RUN_TIMEOUT_MS}ms`,
          data: {
            timeout_ms: INTERNAL_RUN_TIMEOUT_MS,
          },
        })
      );
    }, INTERNAL_RUN_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
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
    const result = await withInternalRunTimeout(
      runLinkedAgentsDailyProfilePost({
        event,
        supabase,
        dryRun: true,
      })
    );

    if (!dryRun && result.status === "preview") {
      queueLinkedAgentsDailyProfilePost({ event, supabase });
      setResponseStatus(event, 202);
      return {
        success: true,
        data: {
          status: "queued",
          draft: result.draft,
        },
      };
    }

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
