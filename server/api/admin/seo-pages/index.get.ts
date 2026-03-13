import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  normalizeSeoPageRecord,
  type SeoPageRow,
  normalizeSeoPageType,
  SEO_PAGE_SELECT,
} from "~/server/utils/seoPages";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const type = query.type ? normalizeSeoPageType(query.type) : null;

    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    let request = supabase
      .from("seo_pages")
      .select(SEO_PAGE_SELECT)
      .order("updated_at", { ascending: false });

    if (type) {
      request = request.eq("page_type", type);
    }

    const { data, error } = await request;
    if (error) throw error;

    const rows = ((data || []) as SeoPageRow[]).map(normalizeSeoPageRecord);
    return { success: true, pages: rows };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to load SEO pages.",
      pages: [],
    };
  }
});
