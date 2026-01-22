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
  category?: string | null;
  topics?: string[];
  people?: string[];
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

export type ManualRewritePayload = {
  title: string;
  summary?: string | null;
  body: string;
  link: string;
  source?: string | null;
  category?: string | null;
  topics?: string[];
  people?: string[];
  publishedDate?: string | null;
  instructions?: string;
  personaKey: string;
  promptOverride?: string;
};

export type ManualRewritePreviewPayload = {
  title: string;
  summary?: string | null;
  body: string;
  link: string;
  source?: string | null;
  category?: string | null;
  topics?: string[];
  people?: string[];
  publishedDate?: string | null;
  instructions?: string;
};

export const useAdminNewsSource = () => {
  const basePath = "/api/admin/news-source";

  const rewriteFromUrl = (payload: UrlRewritePayload) => {
    return $fetch(`${basePath}/rewrite`, {
      method: "POST",
      body: payload,
    });
  };

  const previewManualRewrite = (payload: ManualRewritePreviewPayload) => {
    return $fetch(`${basePath}/manual-preview`, {
      method: "POST",
      body: payload,
    });
  };

  const rewriteManual = (payload: ManualRewritePayload) => {
    return $fetch(`${basePath}/manual-rewrite`, {
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
    previewManualRewrite,
    rewriteManual,
    saveUrlDraft,
  };
};
