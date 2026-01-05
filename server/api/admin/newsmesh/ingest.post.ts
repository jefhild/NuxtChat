export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const supabaseUrl = config?.public?.SUPABASE_URL;
  const serviceRoleKey = config?.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    setResponseStatus(event, 500);
    return {
      success: false,
      error: "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing",
    };
  }

  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/newsmesh-ingest`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
        body: JSON.stringify({ trigger: "admin-manual" }),
      }
    );

    const text = await response.text();
    let payload: any = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch {
      payload = text || null;
    }

    if (!response.ok) {
      setResponseStatus(event, response.status);
      return {
        success: false,
        error: payload?.message || payload || "Failed to trigger Newsmesh ingest.",
        status: response.status,
      };
    }

    return {
      success: true,
      data: payload ?? null,
    };
  } catch (error: any) {
    console.error("[admin/newsmesh] ingest trigger error:", error);
    const statusCode = error?.response?.status || 500;
    setResponseStatus(event, statusCode);
    return {
      success: false,
      error:
        error?.response?._data?.message ||
        error?.message ||
        "Failed to trigger Newsmesh ingest.",
    };
  }
});
