import { createError, readBody, setResponseStatus } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  queueLinkedAgentsDailyProfilePost,
  runLinkedAgentsDailyProfilePost,
} from "~/server/utils/linkedAgents";

const ADMIN_RUN_TIMEOUT_MS = 11000;

type HandlerError = {
  statusCode?: number;
  statusMessage?: string;
  message?: string;
  data?: unknown;
};

const withAdminRunTimeout = async <T>(promise: Promise<T>) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(
        createError({
          statusCode: 504,
          statusMessage: `LinkedAgents admin run timed out after ${ADMIN_RUN_TIMEOUT_MS}ms`,
          data: {
            timeout_ms: ADMIN_RUN_TIMEOUT_MS,
          },
        })
      );
    }, ADMIN_RUN_TIMEOUT_MS);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event).catch(() => ({}))) || {}) as {
      dry_run?: boolean;
    };

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const dryRun = Boolean(body.dry_run);
    const result = await withAdminRunTimeout(
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
