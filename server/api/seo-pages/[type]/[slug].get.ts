import { createError } from "h3";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import { fetchFaqEntriesByIds } from "~/server/utils/faqContent";
import {
  normalizeLocaleCode,
  normalizeSeoPageRecord,
  type SeoPageRow,
  normalizeSeoPageType,
  SEO_PAGE_SELECT,
} from "~/server/utils/seoPages";

export default defineEventHandler(async (event) => {
  try {
    const params = event.context.params || {};
    const pageType = normalizeSeoPageType(params.type);
    const slug = String(params.slug || "")
      .trim()
      .toLowerCase();
    const locale = normalizeLocaleCode(getQuery(event).locale || "en");

    if (!slug) {
      throw createError({ statusCode: 400, statusMessage: "Slug is required" });
    }

    const supabase = await getServiceRoleClient(event);

    const { data, error } = await supabase
      .from("seo_pages")
      .select(SEO_PAGE_SELECT)
      .eq("page_type", pageType)
      .eq("slug", slug)
      .order("updated_at", { ascending: false });

    if (error) throw error;

    const allRows = (data || []) as SeoPageRow[];
    const publishedRows = allRows.filter((row) => row.is_published);

    // 404 only if the page has no published version at all
    if (!publishedRows.length) {
      throw createError({ statusCode: 404, statusMessage: "SEO page not found" });
    }

    // Only serve published variants; unpublished locales fall back to English
    const preferred =
      publishedRows.find((row) => normalizeLocaleCode(row.locale) === locale) ||
      publishedRows.find((row) => normalizeLocaleCode(row.locale) === "en") ||
      publishedRows[0];
    const availableLocales = Array.from(
      new Set(
        publishedRows.map((row) => normalizeLocaleCode(row.locale)).filter(Boolean)
      )
    );

    const normalizedPage = normalizeSeoPageRecord(preferred);
    const faqs = await fetchFaqEntriesByIds(
      supabase,
      Array.isArray(normalizedPage.faqEntryIds) ? normalizedPage.faqEntryIds : [],
      locale
    );

    return {
      success: true,
      page: {
        ...normalizedPage,
        faqs,
      },
      availableLocales,
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    console.error("[seo-pages] failed to load page", {
      params: event.context.params || null,
      query: getQuery(event),
      statusCode: err?.statusCode || 500,
      statusMessage: err?.statusMessage || null,
      message: err?.message || null,
      error,
    });
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to load SEO page.",
    };
  }
});
