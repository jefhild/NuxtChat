import { ensureAdmin } from "~/server/utils/adminAuth";
import { getServiceRoleClient } from "~/server/utils/aiBots";
import {
  buildSeoHeroImageUrl,
  normalizeSeoPageRecord,
  sanitizeSeoPagePayload,
  SEO_PAGE_IMAGE_BUCKET,
  SEO_PAGE_IMAGE_FOLDER,
  type SeoPageRow,
  SEO_PAGE_SELECT,
} from "~/server/utils/seoPages";

export default defineEventHandler(async (event) => {
  try {
    const body = ((await readBody(event)) || {}) as Record<string, unknown>;
    const payload = sanitizeSeoPagePayload(body);

    const config = useRuntimeConfig(event);
    const supabase = await getServiceRoleClient(event);
    await ensureAdmin(event, supabase);

    const existingRequest = supabase
      .from("seo_pages")
      .select("id, hero_image_path")
      .limit(1);

    const { data: existingRow } = payload.id
      ? await existingRequest.eq("id", payload.id).maybeSingle()
      : await existingRequest
          .eq("page_type", payload.page_type)
          .eq("locale", payload.locale)
          .eq("slug", payload.slug)
          .maybeSingle();

    if (payload.hero_image_path) {
      payload.hero_image_url = buildSeoHeroImageUrl(
        config.public.SUPABASE_BUCKET,
        payload.hero_image_path
      );
    }

    const row = {
      ...payload,
      ...(payload.id ? {} : { created_at: new Date().toISOString() }),
    };

    let saveRequest;
    if (payload.id) {
      saveRequest = supabase
        .from("seo_pages")
        .update(row)
        .eq("id", payload.id)
        .select(SEO_PAGE_SELECT)
        .single<SeoPageRow>();
    } else {
      delete row.id;
      saveRequest = supabase
        .from("seo_pages")
        .upsert(row, {
          onConflict: "page_type,locale,slug",
        })
        .select(SEO_PAGE_SELECT)
        .single<SeoPageRow>();
    }

    const { data, error } = await saveRequest;

    if (error) throw error;
    if (!data) {
      throw createError({
        statusCode: 404,
        statusMessage: "SEO page not found.",
      });
    }

    const previousHeroPath = String(existingRow?.hero_image_path || "").trim();
    const nextHeroPath = String(data?.hero_image_path || "").trim();
    if (
      previousHeroPath &&
      previousHeroPath !== nextHeroPath &&
      previousHeroPath.startsWith(`${SEO_PAGE_IMAGE_FOLDER}/`)
    ) {
      await supabase.storage
        .from(SEO_PAGE_IMAGE_BUCKET)
        .remove([previousHeroPath])
        .catch(() => null);
    }

    return {
      success: true,
      page: normalizeSeoPageRecord(data),
    };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; statusMessage?: string; message?: string };
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Unable to save SEO page.",
      details: {
        message: err?.message || null,
        statusMessage: err?.statusMessage || null,
      },
    };
  }
});
