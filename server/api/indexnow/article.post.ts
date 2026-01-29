import { getServiceRoleClient } from "~/server/utils/aiBots";
import { submitIndexNowUrls } from "~/server/utils/indexNow";

export default defineEventHandler(async (event) => {
  try {
    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const slugInput = String(body.slug || "").trim();

    if (!articleId && !slugInput) {
      setResponseStatus(event, 400);
      return { ok: false, error: "articleId or slug is required." };
    }

    const config = useRuntimeConfig(event);
    const siteUrl = config.public?.SITE_URL;
    const indexNowKey = config.INDEXNOW_KEY;
    const indexNowEndpoint = config.INDEXNOW_ENDPOINT;

    if (!siteUrl || !indexNowKey) {
      return { ok: false, skipped: true, reason: "missing-config" };
    }

    const supabase = await getServiceRoleClient(event);
    let article = null as null | { slug?: string | null; is_published?: boolean | null };

    if (articleId) {
      const { data, error } = await supabase
        .from("articles")
        .select("slug, is_published")
        .eq("id", articleId)
        .maybeSingle();
      if (error) throw error;
      article = data || null;
    } else if (slugInput) {
      const { data, error } = await supabase
        .from("articles")
        .select("slug, is_published")
        .eq("slug", slugInput)
        .maybeSingle();
      if (error) throw error;
      article = data || null;
    }

    if (!article?.slug) {
      setResponseStatus(event, 404);
      return { ok: false, error: "Article not found." };
    }

    if (!article.is_published) {
      return { ok: false, skipped: true, reason: "not-published" };
    }

    const result = await submitIndexNowUrls({
      siteUrl,
      key: indexNowKey,
      endpoint: indexNowEndpoint,
      urls: [`/articles/${article.slug}`],
    });

    return { ok: true, result };
  } catch (err) {
    console.error("[indexnow/article] error:", err);
    setResponseStatus(event, 500);
    return { ok: false, error: "IndexNow submission failed." };
  }
});
