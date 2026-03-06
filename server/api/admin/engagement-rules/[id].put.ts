import { buildRulePayload } from "~/server/utils/engagementRules";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { ensureAdmin } from "~/server/utils/adminAuth";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const id = params.id;
    if (!id) {
      setResponseStatus(event, 400);
      return { success: false, error: "Missing engagement rule id" };
    }

    const body = (await readBody(event)) || {};
    const payload = buildRulePayload(body);

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    if (payload.is_default) {
      await supabase
        .from("ai_engagement_rules")
        .update({ is_default: false })
        .eq("context", payload.context)
        .neq("id", id);
    }

    const { data, error } = await supabase
      .from("ai_engagement_rules")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    const err = error as any;
    console.error("[admin/engagement-rules] update error:", err);
    const message =
      err?.statusMessage || err?.message || "Unable to update engagement rule";
    const status = err?.statusCode
      ? err.statusCode
      : /missing|context|name/i.test(message)
      ? 400
      : 500;
    setResponseStatus(event, status);
    return { success: false, error: message };
  }
});
