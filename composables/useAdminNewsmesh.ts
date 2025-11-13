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
  };
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

  const saveRewriteDraft = (payload: NewsmeshDraftPayload) => {
    return $fetch(`${basePath}/drafts`, {
      method: "POST",
      body: payload,
    });
  };

  return {
    fetchArticles,
    rewriteArticles,
    saveRewriteDraft,
  };
};
