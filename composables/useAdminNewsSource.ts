export type UrlRewritePayload = {
  url: string;
  personaKey: string;
  instructions?: string;
};

export type UrlDraftPayload = {
  sourceUrl: string;
  personaKey: string;
  sourceTitle?: string | null;
  sourceSummary?: string | null;
  sourceDomain?: string | null;
  rewrite: {
    headline: string;
    summary: string;
    body: string;
    references: Array<{ label: string; url?: string | null }>;
    social?: {
      facebook?: { caption?: string | null; link?: string | null };
      instagram?: { caption?: string | null; image_url?: string | null };
    } | null;
    raw?: string;
  };
};

export const useAdminNewsSource = () => {
  const basePath = "/api/admin/news-source";

  const rewriteFromUrl = (payload: UrlRewritePayload) => {
    return $fetch(`${basePath}/rewrite`, {
      method: "POST",
      body: payload,
    });
  };

  const saveUrlDraft = (payload: UrlDraftPayload) => {
    return $fetch(`${basePath}/drafts`, {
      method: "POST",
      body: payload,
    });
  };

  return {
    rewriteFromUrl,
    saveUrlDraft,
  };
};
