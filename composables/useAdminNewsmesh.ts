export type NewsmeshQueryParams = {
  page?: number;
  pageSize?: number;
  stream?: string;
  status?: string;
  search?: string;
};

export type NewsmeshRewritePayload = {
  articleIds: string[];
  personaKey: string;
  instructions?: string;
  promptOverrides?: Record<string, string>;
};

export type NewsmeshRewriteReference = {
  label: string;
  url?: string | null;
};

export type NewsmeshDraftPayload = {
  articleId: string;
  personaKey: string;
  rewrite: {
    headline: string;
    summary: string;
    body: string;
    references: NewsmeshRewriteReference[];
    social?: {
      facebook: {
        caption: string;
        link?: string | null;
      };
      instagram: {
        caption: string;
        image_url?: string | null;
      };
    } | null;
  };
};

export type NewsmeshRewritePreviewPayload = {
  articleIds: string[];
  instructions?: string;
};

export const useAdminNewsmesh = () => {
  const basePath = "/api/admin/newsmesh";

  const fetchArticles = (params: NewsmeshQueryParams = {}) => {
    return $fetch(basePath, { method: "GET", params });
  };

  const rewriteArticles = (payload: NewsmeshRewritePayload) => {
    return $fetch(`${basePath}/rewrite`, {
      method: "POST",
      body: payload,
    });
  };

  const previewRewritePrompts = (payload: NewsmeshRewritePreviewPayload) => {
    return $fetch(`${basePath}/rewrite-preview`, {
      method: "POST",
      body: payload,
    });
  };

  const saveRewriteDraft = (payload: NewsmeshDraftPayload) => {
    return $fetch(`${basePath}/drafts`, {
      method: "POST",
      body: payload,
    });
  };

  const triggerIngest = () => {
    return $fetch(`${basePath}/ingest`, {
      method: "POST",
    });
  };

  const deleteArticles = (articleIds: string[]) => {
    return $fetch(`${basePath}/delete`, {
      method: "POST",
      body: { articleIds },
    });
  };

  return {
    fetchArticles,
    rewriteArticles,
    previewRewritePrompts,
    saveRewriteDraft,
    triggerIngest,
    deleteArticles,
  };
};
