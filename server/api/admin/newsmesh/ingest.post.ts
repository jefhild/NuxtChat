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
    const result = await $fetch(`${supabaseUrl}/functions/v1/newsmesh-ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
      },
      body: { trigger: "admin-manual" },
    });

    return {
      success: true,
      data: result ?? null,
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
