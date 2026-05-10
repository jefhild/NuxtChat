import { serverSupabaseUser } from "#supabase/server";
import { useDb } from "@/composables/useDB";

const SAMPLE_LIMIT = 500;

const classifyBlockReason = (reason: string | null) => {
  const value = String(reason || "").toLowerCase();
  if (!value) return "other";
  if (value.includes("captcha")) return "captcha";
  if (value.includes("rate_limit")) return "rate_limit";
  return "other";
};

export default defineEventHandler(async (event) => {
  try {
    const user = await serverSupabaseUser(event);
    if (!user?.id) {
      setResponseStatus(event, 401);
      return { error: "Unauthorized" };
    }

    const cfg = useRuntimeConfig(event);
    const { getServerClientFrom } = useDb();
    const supa = getServerClientFrom(
      cfg.public.SUPABASE_URL,
      cfg.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: me, error: meErr } = await supa
      .from("profiles")
      .select("is_admin")
      .eq("user_id", user.id)
      .single();

    if (meErr) {
      console.error("[admin/auth-send-attempts] admin check error:", meErr);
      setResponseStatus(event, 500);
      return { error: { stage: "admin_check", message: meErr.message } };
    }

    if (!me?.is_admin) {
      setResponseStatus(event, 403);
      return { error: "Forbidden" };
    }

    const query = getQuery(event);
    const hours = Math.min(24 * 30, Math.max(1, Number(query.hours) || 24));
    const limit = Math.min(100, Math.max(5, Number(query.limit) || 12));
    const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    const [recentResult, sampleResult] = await Promise.all([
      supa
        .from("auth_send_attempts")
        .select(
          "id, created_at, action_type, email_normalized, ip_address, user_agent, auth_user_id, mode, captcha_passed, decision, block_reason"
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(limit),
      supa
        .from("auth_send_attempts")
        .select(
          "id, created_at, email_normalized, ip_address, decision, block_reason"
        )
        .gte("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(SAMPLE_LIMIT),
    ]);

    if (recentResult.error || sampleResult.error) {
      const error = recentResult.error || sampleResult.error;
      console.error("[admin/auth-send-attempts] query error:", error);
      setResponseStatus(event, 500);
      return {
        error: {
          stage: "query",
          message: error?.message || "Failed to load auth send attempts.",
        },
      };
    }

    const recentItems = Array.isArray(recentResult.data) ? recentResult.data : [];
    const sampleItems = Array.isArray(sampleResult.data) ? sampleResult.data : [];

    const blockedItems = sampleItems.filter((item) => item?.decision === "blocked");
    const uniqueIps = new Set(
      sampleItems.map((item) => item?.ip_address).filter(Boolean)
    );
    const uniqueEmails = new Set(
      sampleItems.map((item) => item?.email_normalized).filter(Boolean)
    );

    const blockedByReason = blockedItems.reduce<Record<string, number>>((acc, item) => {
      const key = classifyBlockReason(item?.block_reason || null);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const topBlockedIps = Object.entries(
      blockedItems.reduce<Record<string, number>>((acc, item) => {
        const ip = String(item?.ip_address || "").trim();
        if (!ip) return acc;
        acc[ip] = (acc[ip] || 0) + 1;
        return acc;
      }, {})
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([ip, count]) => ({ ip, count }));

    return {
      windowHours: hours,
      sampledRows: sampleItems.length,
      sampleTruncated: sampleItems.length >= SAMPLE_LIMIT,
      summary: {
        total: sampleItems.length,
        allowed: sampleItems.filter((item) => item?.decision === "allowed").length,
        blocked: blockedItems.length,
        uniqueIps: uniqueIps.size,
        uniqueEmails: uniqueEmails.size,
        blockedCaptcha: blockedByReason.captcha || 0,
        blockedRateLimit: blockedByReason.rate_limit || 0,
      },
      topBlockedIps,
      recent: recentItems,
    };
  } catch (err: any) {
    console.error("[admin/auth-send-attempts] error:", err);
    setResponseStatus(event, 500);
    return {
      error: {
        stage: "unhandled",
        message: err?.message || "Internal error",
      },
    };
  }
});
