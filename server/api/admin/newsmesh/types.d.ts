export type RewriteReference = {
  label: string;
  url?: string | null;
};

export type RewritePayload = {
  headline: string;
  summary: string;
  body: string;
  references: RewriteReference[];
  raw?: string;
};

export type NewsmeshArticle = {
  stream: string;
  id: string;
  article_id: string | null;
  title: string | null;
  description: string | null;
  link: string | null;
  link_hash: string | null;
  media_url: string | null;
  published_date: string | null;
  source: string | null;
  category: string | null;
  topics: unknown;
  people: unknown;
  first_seen_at: string | null;
  last_seen_at: string | null;
  seen_count: number | null;
  status: string | null;
};
