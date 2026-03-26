import { getQuery, readBody, setResponseStatus } from "h3";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { runHoneyMoltbookAutopost } from "~/server/utils/honeyMoltbook";
import { ensureAutomationSecret } from "~/server/utils/internalAutomationAuth";

export default defineEventHandler(async (event) => {
  try {
    ensureAutomationSecret(event);

    const query = getQuery(event);
    const body = ((await readBody(event).catch(() => ({}))) || {}) as {
      limit?: number;
      dry_run?: boolean;
    };

    const supabase = await getServiceRoleClient(event);
    const limit = Number(body.limit ?? query.limit ?? 3) || 3;
    const dryRun =
      String(body.dry_run ?? query.dry_run ?? "").trim().toLowerCase() === "true";

    const result = await runHoneyMoltbookAutopost({
      event,
      supabase,
      limit,
      dryRun,
    });

    return {
      success: true,
      data: result,
    };
  } catch (error: any) {
    console.error("[internal][moltbook][honey-run] error:", error);
    setResponseStatus(event, error?.statusCode || 500);
    return {
      success: false,
      error:
        error?.statusMessage || error?.message || "Unable to run honey Moltbook automation",
    };
  }
});
