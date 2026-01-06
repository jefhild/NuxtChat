import { getServiceRoleClient } from "~/server/utils/aiBots";

type SocialDraft = {
  facebook: { caption: string; link?: string | null; published_at?: string };
  instagram: {
    caption: string;
    image_url?: string | null;
    published_at?: string;
  };
};

const buildFallbackSocial = (input: {
  title: string;
  summary: string;
  url: string;
  imageUrl: string | null;
}): SocialDraft => {
  const cleanTitle = input.title?.trim() || "New article";
  const cleanSummary = input.summary?.trim();
  const summaryText = cleanSummary ? ` ${cleanSummary}` : "";
  const fbCaption = `${cleanTitle}.${summaryText}\n\n${input.url}`.trim();
  const igCaption = `${cleanTitle}.${summaryText}\n\n#news #update #story`;
  return {
    facebook: { caption: fbCaption, link: input.url },
    instagram: { caption: igCaption, image_url: input.imageUrl },
  };
};

const normalizeSocial = (
  value: any,
  fallback: SocialDraft
): SocialDraft => {
  const facebookCaption =
    typeof value?.facebook?.caption === "string"
      ? value.facebook.caption.trim()
      : fallback.facebook.caption;
  const facebookLink =
    typeof value?.facebook?.link === "string"
      ? value.facebook.link
      : fallback.facebook.link;
  const instagramCaption =
    typeof value?.instagram?.caption === "string"
      ? value.instagram.caption.trim()
      : fallback.instagram.caption;
  const instagramImageUrl =
    typeof value?.instagram?.image_url === "string"
      ? value.instagram.image_url
      : fallback.instagram.image_url;

  return {
    facebook: { caption: facebookCaption, link: facebookLink },
    instagram: { caption: instagramCaption, image_url: instagramImageUrl },
  };
};

const ensureOk = async (response: Response, label: string) => {
  if (response.ok) return;
  const text = await response.text();
  throw new Error(`${label} failed: ${response.status} ${text}`);
};

const postToFacebook = async (input: {
  version: string;
  pageId: string;
  accessToken: string;
  caption: string;
  link?: string | null;
}) => {
  const params = new URLSearchParams();
  params.set("message", input.caption);
  if (input.link) params.set("link", input.link);
  params.set("access_token", input.accessToken);

  const response = await fetch(
    `https://graph.facebook.com/${input.version}/${input.pageId}/feed`,
    {
      method: "POST",
      body: params,
    }
  );
  await ensureOk(response, "Facebook post");
  return response.json();
};

const createInstagramMedia = async (input: {
  version: string;
  igUserId: string;
  accessToken: string;
  caption: string;
  imageUrl: string;
}) => {
  const params = new URLSearchParams();
  params.set("image_url", input.imageUrl);
  params.set("caption", input.caption);
  params.set("access_token", input.accessToken);

  const response = await fetch(
    `https://graph.facebook.com/${input.version}/${input.igUserId}/media`,
    {
      method: "POST",
      body: params,
    }
  );
  await ensureOk(response, "Instagram media create");
  return response.json();
};

const publishInstagramMedia = async (input: {
  version: string;
  igUserId: string;
  accessToken: string;
  creationId: string;
}) => {
  const params = new URLSearchParams();
  params.set("creation_id", input.creationId);
  params.set("access_token", input.accessToken);

  const response = await fetch(
    `https://graph.facebook.com/${input.version}/${input.igUserId}/media_publish`,
    {
      method: "POST",
      body: params,
    }
  );
  await ensureOk(response, "Instagram media publish");
  return response.json();
};

export default defineEventHandler(async (event) => {
  try {
    return {
      success: true,
      stub: true,
      message:
        "Social publishing is disabled until Facebook credentials are configured.",
    };
    const body = (await readBody(event)) || {};
    const articleId = String(body.articleId || "").trim();
    const force = Boolean(body.force);

    if (!articleId) {
      setResponseStatus(event, 400);
      return { success: false, error: "articleId is required." };
    }

    const cfg = useRuntimeConfig(event);
    const pageId = cfg.META_PAGE_ID;
    const pageToken = cfg.META_PAGE_ACCESS_TOKEN;
    const igUserId = cfg.META_IG_USER_ID;
    const version = cfg.META_GRAPH_VERSION || "v20.0";

    if (!pageId || !pageToken) {
      setResponseStatus(event, 400);
      return {
        success: false,
        error:
          "Meta credentials are not configured. Set META_PAGE_ID and META_PAGE_ACCESS_TOKEN.",
      };
    }

    const supabase = await getServiceRoleClient(event);
    const { data: article, error } = await supabase
      .from("articles")
      .select("id, title, slug, image_path, rewrite_meta, newsmesh_meta")
      .eq("id", articleId)
      .maybeSingle();

    if (error) throw error;
    if (!article) {
      setResponseStatus(event, 404);
      return { success: false, error: "Article not found." };
    }

    const articleUrl = `${cfg.public.SITE_URL}/articles/${article.slug}`;
    const rewriteMeta = (article.rewrite_meta || {}) as Record<string, any>;
    const existingSocial = (rewriteMeta.social || {}) as Partial<SocialDraft>;
    const summary =
      rewriteMeta.summary ||
      article.newsmesh_meta?.summary ||
      article.newsmesh_meta?.description ||
      "";

    const imageUrl =
      (article.image_path
        ? `${cfg.public.SUPABASE_BUCKET}/articles/${article.image_path}`
        : null) ||
      existingSocial.instagram?.image_url ||
      article.newsmesh_meta?.media_url ||
      null;

    const fallback = buildFallbackSocial({
      title: article.title || "New article",
      summary,
      url: articleUrl,
      imageUrl,
    });

    const social = normalizeSocial(existingSocial, fallback);
    const updates: Record<string, any> = { ...rewriteMeta, social };

    const results: Record<string, any> = {};

    if (!social.facebook.published_at || force) {
      const fb = await postToFacebook({
        version,
        pageId,
        accessToken: pageToken,
        caption: social.facebook.caption,
        link: social.facebook.link || articleUrl,
      });
      social.facebook.published_at = new Date().toISOString();
      (social.facebook as any).post_id = fb?.id || null;
      results.facebook = fb;
    }

    const canPostInstagram = Boolean(igUserId);

    if (canPostInstagram && (!social.instagram.published_at || force)) {
      if (!social.instagram.image_url) {
        setResponseStatus(event, 400);
        return {
          success: false,
          error:
            "Instagram requires an image_url. Add an article image or a fallback media_url.",
        };
      }
      const created = await createInstagramMedia({
        version,
        igUserId,
        accessToken: pageToken,
        caption: social.instagram.caption,
        imageUrl: social.instagram.image_url,
      });
      const published = await publishInstagramMedia({
        version,
        igUserId,
        accessToken: pageToken,
        creationId: created?.id,
      });
      social.instagram.published_at = new Date().toISOString();
      (social.instagram as any).media_id = published?.id || null;
      results.instagram = published;
    }

    updates.social = social;

    await supabase
      .from("articles")
      .update({ rewrite_meta: updates })
      .eq("id", articleId);

    return { success: true, data: results };
  } catch (error) {
    const err = error as any;
    console.error("[admin/articles] publish-social error:", err);
    setResponseStatus(event, err?.statusCode || 500);
    return {
      success: false,
      error: err?.statusMessage || err?.message || "Publish failed.",
    };
  }
});
