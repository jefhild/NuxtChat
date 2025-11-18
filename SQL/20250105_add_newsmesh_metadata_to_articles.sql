-- Capture the originating Newsmesh record and the rewrite payload for articles
ALTER TABLE public.articles
ADD COLUMN IF NOT EXISTS newsmesh_id TEXT,
ADD COLUMN IF NOT EXISTS newsmesh_meta JSONB,
ADD COLUMN IF NOT EXISTS rewrite_meta JSONB,
ADD COLUMN IF NOT EXISTS persona_display_name TEXT,
ADD COLUMN IF NOT EXISTS persona_avatar_url TEXT;

COMMENT ON COLUMN public.articles.newsmesh_id IS
  'Source Newsmesh record id (from newsmesh_union_view).';

COMMENT ON COLUMN public.articles.newsmesh_meta IS
  'Snapshot of Newsmesh metadata (title, summary, link, source, topics, people, stream, published_date, media_url).';

COMMENT ON COLUMN public.articles.rewrite_meta IS
  'Structured rewrite payload returned by the persona (headline, summary, body, references, persona info).';

COMMENT ON COLUMN public.articles.persona_display_name IS
  'Friendly persona label shown on the article.';

COMMENT ON COLUMN public.articles.persona_avatar_url IS
  'Avatar URL for the persona used when drafting the article.';

CREATE INDEX IF NOT EXISTS articles_newsmesh_id_idx
  ON public.articles (newsmesh_id);
