import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  normalizeLocaleCode,
  normalizeSeoPageRecord,
  type SeoPageRow,
  normalizeSeoPageType,
  pickBestLocaleRows,
  SEO_PAGE_SELECT,
} from "~/server/utils/seoPages";

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);
    const type = normalizeSeoPageType(query.type);
    const locale = normalizeLocaleCode(query.locale || "en");
    const limit = Math.min(Math.max(Number(query.limit || 50), 1), 100);

    const supabase = await getServiceRoleClient(event);
    const { data, error } = await supabase
      .from("seo_pages")
      .select(SEO_PAGE_SELECT)
      .eq("page_type", type)
      .eq("is_published", true)
      .in("locale", [locale, "en"])
      .order("updated_at", { ascending: false })
      .limit(limit);

    if (error) throw error;

    const pages = pickBestLocaleRows((data || []) as SeoPageRow[], locale).map(
      normalizeSeoPageRecord
    );
    return { success: true, pages };
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
