import { createError } from "h3";
import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event)) || {}) as { id?: string };
    const id = String(body.id || "").trim();
    if (!id) {
      throw createError({
        statusCode: 400,
        statusMessage: "SEO page id is required",
      });
    }

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const { error } = await supabase.from("seo_pages").delete().eq("id", id);
    if (error) throw error;

    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to delete SEO page.",
    };
  }
});
